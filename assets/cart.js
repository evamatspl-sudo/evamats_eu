class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  onCartUpdate() {
    fetch(`${routes.cart_url}?section_id=main-cart-items`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceQty = html.querySelector('cart-items');
        this.innerHTML = sourceQty.innerHTML;
      })
      .catch(e => {
        console.error(e);
      });
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents'
      }
    ];
  }

  async updateQuantity(line, quantity, name) {
  const TUNNEL_VARIANT_ID = 55239270302074;
  const DROP_CELL_SHAPE_VARIANT_ID = 51194860011798;

  function normalize(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /** EU storefront: translated property names + drops value (drops / Tropfen / Kapky / krople …) */
  function isCellShapePropertyName(cleanName) {
    return (
      (cleanName.includes('ksztalt') && cleanName.includes('komorek'))
      || (cleanName.includes('cell') && cleanName.includes('shape'))
      || (cleanName.includes('form') && cleanName.includes('zelle'))
      || (cleanName.includes('tvar') && cleanName.includes('bun'))
    );
  }

  function isDropsCellValue(cleanValue) {
    if (!cleanValue) return false;
    if (cleanValue.includes('krople')) return true;
    if (cleanValue.includes('tropfen')) return true;
    if (cleanValue.includes('kapky')) return true;
    if (cleanValue.includes('kapek')) return true;
    if (cleanValue === 'drops' || /\bdrops\b/.test(cleanValue)) return true;
    if (cleanValue.includes('drop') && !cleanValue.includes('honey')) return true;
    return false;
  }

  function lineItemIsDropCellShape(cleanName, cleanValue) {
    return isCellShapePropertyName(cleanName) && isDropsCellValue(cleanValue);
  }

  async function syncTunnel(cart) {
    try {
      const tylCount = cart.items
        .filter(item => item.options_with_values?.some(opt =>
          typeof opt.value === 'string' && opt.value.toLowerCase().includes('tył')))
        .reduce((sum, item) => sum + item.quantity, 0);

      const tunnelLines = cart.items.filter(i => i.variant_id === TUNNEL_VARIANT_ID);
      const tunnelTotal = tunnelLines.reduce((sum, i) => sum + i.quantity, 0);


      if (tylCount > tunnelTotal) {
        const toAdd = tylCount - tunnelTotal;
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: TUNNEL_VARIANT_ID, quantity: toAdd }]
          })
        });
      } else if (tunnelTotal > tylCount) {
        let toRemove = tunnelTotal - tylCount;
        for (const lineItem of tunnelLines) {
          if (toRemove <= 0) break;
          const removeQty = Math.min(lineItem.quantity, toRemove);
          const newQty = lineItem.quantity - removeQty;
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lineItem.key, quantity: newQty })
          });
          toRemove -= removeQty;
        }
      }
    } catch (err) {
      console.error('syncTunnel error:', err);
    }
  }

  async function syncDropCellShape(cart) {
    try {

      const dropCount = cart.items
        .filter(item => {
          const props = item.properties;
          let hasDrop = false;
          if (typeof props === 'object' && props !== null) {
            if (Array.isArray(props)) {
              // Rare, but handle array of objects or pairs
              hasDrop = props.some(prop => {
                const name = Array.isArray(prop) ? (prop[0] || '') : (prop.name || '');
                const value = Array.isArray(prop) ? prop[1] : prop.value;
                const cleanName = normalize(name.replace(/[:\s]*$/, ''));
                const cleanValue = normalize(value || '');
                return lineItemIsDropCellShape(cleanName, cleanValue);
              });
            } else {
              // object {name: value}
              hasDrop = Object.entries(props).some(([name, value]) => {
                const cleanName = normalize((name || '').replace(/[:\s]*$/, ''));
                const cleanValue = normalize(value || '');
                return lineItemIsDropCellShape(cleanName, cleanValue);
              });
            }
          }
          // Also check options_with_values as fallback
          if (!hasDrop && Array.isArray(item.options_with_values)) {
            hasDrop = item.options_with_values.some(opt => {
              const cleanName = normalize((opt.name || '').replace(/[:\s]*$/, ''));
              const cleanValue = normalize(typeof opt.value === 'string' ? opt.value : '');
              return lineItemIsDropCellShape(cleanName, cleanValue);
            });
          }
          return hasDrop;
        })
        .reduce((sum, item) => sum + item.quantity, 0);

      const dropLines = cart.items.filter(i => i.variant_id === DROP_CELL_SHAPE_VARIANT_ID);
      const dropTotal = dropLines.reduce((sum, i) => sum + i.quantity, 0);


      if (dropCount > dropTotal) {
        const toAdd = dropCount - dropTotal;
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: DROP_CELL_SHAPE_VARIANT_ID, quantity: toAdd }]
          })
        });
      } else if (dropTotal > dropCount) {
        let toRemove = dropTotal - dropCount;
        for (const lineItem of dropLines) {
          if (toRemove <= 0) break;
          const removeQty = Math.min(lineItem.quantity, toRemove);
          const newQty = lineItem.quantity - removeQty;
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lineItem.key, quantity: newQty })
          });
          toRemove -= removeQty;
        }
      } else {
      }
    } catch (err) {
      console.error('syncDropCellShape error:', err);
    }
  }

  this.enableLoading(line);

  const body = JSON.stringify({
    line,
    quantity,
    sections: this.getSectionsToRender().map((section) => section.section),
    sections_url: window.location.pathname
  });

  try {
    const response = await fetch(`${routes.cart_change_url}`, { ...fetchConfig(), body });
    const stateText = await response.text();
    let parsedState = JSON.parse(stateText);

    // Fetch fresh cart after initial change
    let currentCartRes = await fetch('/cart.js');
    let currentCart = await currentCartRes.json();

    // Sync tunnel
    await syncTunnel(currentCart);

    // Fetch updated cart after tunnel sync
    const updatedCartRes = await fetch('/cart.js');
    const updatedCart = await updatedCartRes.json();

    // Sync drop cell shape with updated cart
    await syncDropCellShape(updatedCart);

    // Fetch final fresh cart after all syncs
    const freshCartRes = await fetch('/cart.js');
    const freshCart = await freshCartRes.json();

    // Update sections with final state
    const sectionsRes = await fetch(`${window.location.pathname}?sections=${this.getSectionsToRender().map(s => s.section).join(',')}`);
    const sectionsData = await sectionsRes.json();

    this.classList.toggle('is-empty', freshCart.item_count === 0);
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const cartFooter = document.getElementById('main-cart-footer');

    if (cartFooter) cartFooter.classList.toggle('is-empty', freshCart.item_count === 0);
    if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', freshCart.item_count === 0);

    this.getSectionsToRender().forEach(section => {
      const elementToReplace =
        document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
      elementToReplace.innerHTML = this.getSectionInnerHTML(sectionsData[section.section], section.selector);
    });

    publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items' });

    var upsellRoot = document.querySelector('.drawer__progress_products');
    if (upsellRoot) {
      function initCartUpsellSwiper() {
        if (typeof Swiper === 'undefined') return;
        var eq = function () {
          if (window.equalizeDrawerUpsellHeights) window.equalizeDrawerUpsellHeights(upsellRoot);
        };
        new Swiper(upsellRoot, {
          spaceBetween: 10,
          slidesPerView: 'auto',
          navigation: {
            nextEl: upsellRoot.querySelector('.swiper-button-next'),
            prevEl: upsellRoot.querySelector('.swiper-button-prev'),
          },
          breakpoints: {
            768: { slidesPerView: 2, centeredSlides: false },
            1024: { slidesPerView: 3, centeredSlides: false },
          },
          on: {
            init: eq,
            resize: eq,
            slideChangeTransitionEnd: eq,
          },
        });
        eq();
        setTimeout(eq, 50);
        setTimeout(eq, 250);
        upsellRoot.querySelectorAll('img').forEach(function (img) {
          if (img.complete) return;
          img.addEventListener('load', eq, { once: true });
        });
      }
      if (window.ensureSwiperLoaded) {
        window.ensureSwiperLoaded(initCartUpsellSwiper);
      } else {
        initCartUpsellSwiper();
      }
    }
  } catch (err) {
    console.error(err);
    this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
    const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
    errors.textContent = window.cartStrings.error;
  } finally {
    this.disableLoading(line);
  }
}

  updateLiveRegions(line, message) {
    const lineItemError = document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').innerHTML = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define('cart-note', class CartNote extends HTMLElement {
    constructor() {
      super();

      this.addEventListener('change', debounce((event) => {
        const body = JSON.stringify({ note: event.target.value });
        fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
      }, ON_CHANGE_DEBOUNCE_TIMER))
    }
  });
};
// Custom discount for the cart
// const discountButtons = [
//   { buttonId: 'applyDiscountButton25', discountCode: 'przedpłata70' },
//   { buttonId: 'applyDiscountButton50', discountCode: 'przedpłata50' },
//   { buttonId: 'applyDiscountButton70', discountCode: 'przedpłata25'}
// ];

// discountButtons.forEach(button => {
//   const discountButton = document.getElementById(button.buttonId);
//   if (discountButton) {
//     discountButton.addEventListener('click', () => applyDiscount(button.discountCode));
//   } else {
//     console.error(`Discount button with id ${button.buttonId} not found.`);
//   }
// });

// const applyDiscount = discountCode => {
//   const couponInput = document.querySelector('.docapp-coupon-input--input');
//   const discountMessageElement = document.getElementById('discountMessage');

//   if (couponInput && couponInput.value !== undefined) {
//     couponInput.value = discountCode;

//     if (discountMessageElement) {
//       discountMessageElement.innerHTML = '';
//     }
//   } else {
//     console.error('The input element was not found or does not have a property value.');
//   }
// };

// document.getElementById('discount-popup__navig--apply').addEventListener('click', () => {
//   const couponInput = document.querySelector('.docapp-coupon-input--input');

//   if (couponInput && couponInput.value !== undefined) {
//     const inputEvent = new Event('input', { bubbles: true, cancelable: true });
//     couponInput.dispatchEvent(inputEvent);

//     const applyButton = document.querySelector('.docapp-coupon-input--button');
//     if (applyButton) {
//       applyButton.click();
//       window.location.href = '/checkout';
//     }
//   } else {
//     console.error('The input element was not found or does not have a property value.');
//   }
// });

// document.getElementById('discount-popup__navig--return').addEventListener('click', () => {
//   const couponInput = document.querySelector('.docapp-coupon-input--input');

//   if (couponInput) {
//     couponInput.value = '';
//   } else {
//     console.error('The input element was not found.');
//   }
// });

// document.getElementById('discount-popup__navig--apply').addEventListener('click', () => {
//   const discountPopup = document.getElementById('discount-popup');

//   if (discountPopup) {
//     discountPopup.style.display = 'none';
//   } else {
//     console.error('The discount-popup element was not found.');
//   }
// });

// // Add an active class to discounts
// document.addEventListener('DOMContentLoaded', () => {
//   const allButtons = document.querySelectorAll('.button-discount');
//   const returnNavigationButton = document.getElementById('discount-popup__navig--return');

//   allButtons.forEach(button => {
//     button.addEventListener('click', () => {
//       allButtons.forEach(otherButton => {
//         if (otherButton !== button) {
//           otherButton.classList.remove('activeDiscountColor');
//         }
//       });
//       button.classList.toggle('activeDiscountColor');
//     });
//   });

//   returnNavigationButton.addEventListener('click', () => {
//     allButtons.forEach(button => button.classList.remove('activeDiscountColor'));
//   });
// });

// // Prepaid discount
// document.addEventListener('DOMContentLoaded', () => {
//   const subtotalElement = document.querySelector('.bcpo-cart-original-total');
//   const totalPriceInput = document.getElementById('total_price');

//   if (subtotalElement && totalPriceInput) {
//     const subtotalValue = subtotalElement.innerText || subtotalElement.textContent;
//     const numericValue = subtotalValue.replace(/[^\d.-]/g, '');

//     const parsedValue = parseFloat(numericValue).toString();

//     totalPriceInput.value = parsedValue;
//   }
// });

// // Display data from the desired amount
// document.addEventListener('DOMContentLoaded', () => {
//   const inputDiscount = document.getElementById('discount-popup__navig--input');
//   const applyButton = document.getElementById('discount-popup__navig--apply');
//   const partPaymentInput = document.getElementById('part_payment');
//   const submitButton = document.querySelector('button[type="submit"]');

//   if (inputDiscount && applyButton && partPaymentInput && submitButton) {
//     applyButton.addEventListener('click', () => {
//       partPaymentInput.value = inputDiscount.value;
//       submitButton.click();
//     });
//   }
// });

// // Functionality responsible for partial payment where we enter the amount manually
// document.addEventListener('DOMContentLoaded', () => {
//   const applyButton = document.getElementById('discount-popup__navig--apply');

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//   if (applyButton) {
//     applyButton.addEventListener('click', async () => {
//       await delay(1000);

//       const discountValueElement = document.querySelector('.js-discount-value');
//       const couponInputElement = document.querySelector('.docapp-coupon-input--input');
//       const applyCouponButton = document.querySelector('.docapp-coupon-input--button');

//       if (discountValueElement && couponInputElement && applyCouponButton) {
//         const discountValue = discountValueElement.textContent.trim();

//         couponInputElement.value = discountValue;

//         const inputEvent = new Event('input', { bubbles: true, cancelable: true });
//         couponInputElement.dispatchEvent(inputEvent);

//         applyCouponButton.click();
//       } else {
//         console.error('Element with class .js-discount-value, .docapp-coupon-input--input, or .docapp-coupon-input--button not found.');
//       }
//     });
//   }
// });


// // Validation of the input so that less can not enter the amount
// document.addEventListener('DOMContentLoaded', function () {

//   const inputField = document.getElementById('discount-popup__navig--input');
//   const errorElement = document.getElementById('discount-popup__navig--input__error');


//   inputField.addEventListener('input', function () {

//     const inputValue = parseFloat(inputField.value);

//     if (isNaN(inputValue) || inputValue < 100) {

//       errorElement.textContent = 'Kwota nie może być mniejsza niż 100';
//     } else {

//       errorElement.textContent = '';
//     }
//   });
// });
