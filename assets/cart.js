class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      if (!cartItems) return;

      const line = this.dataset.index;
      const lineKey = this.dataset.key;

      if (cartItems.classList.contains('evamats-cart') && typeof cartItems.softRemoveLine === 'function') {
        cartItems.softRemoveLine(line, lineKey);
      } else {
        cartItems.updateQuantity(line, 0);
      }
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
      this._removedGhosts = new Map();
      this.onCartUpdate();
    });

    if (!this._restoreClickBound) {
      this._restoreClickBound = true;
      this.addEventListener('click', (event) => {
        const restoreButton = event.target.closest('[data-cart-restore]');
        if (!restoreButton) return;
        event.preventDefault();
        const removedItem = restoreButton.closest('.evamats-cart-item--removed');
        if (removedItem) {
          this.restoreRemovedItem(removedItem);
        }
      });
    }
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    const target = event.target;
    if (!target || target.matches('[data-cart-terms-checkbox]') || !target.dataset.index) return;
    this.updateQuantity(target.dataset.index, target.value, target.getAttribute('name'));
  }

  onCartUpdate() {
    fetch(`${routes.cart_url}?section_id=main-cart-items`)
      .then((response) => response.text())
      .then((responseText) => {
        this.applyMainCartItemsSection(responseText);
        this.appendRemovedGhosts();
        this.afterCartContentsUpdate();
      })
      .catch(e => {
        console.error(e);
      });
  }

  applyMainCartItemsSection(sectionHtml) {
    const html = new DOMParser().parseFromString(sectionHtml, 'text/html');
    const sourceCartItems = html.querySelector('cart-items');
    if (!sourceCartItems) return;

    const currentUpsell = this.querySelector(':scope > .evamats-cart-upsell');
    const newUpsell = sourceCartItems.querySelector(':scope > .evamats-cart-upsell');
    if (newUpsell) {
      const importedUpsell = document.importNode(newUpsell, true);
      if (currentUpsell) {
        currentUpsell.replaceWith(importedUpsell);
      } else {
        const main = this.querySelector(':scope > .evamats-cart__main');
        this.insertBefore(importedUpsell, main || null);
      }
    } else if (currentUpsell) {
      currentUpsell.remove();
    }

    const sourceLayout = sourceCartItems.querySelector('.js-contents');
    const targetLayout = this.querySelector('.js-contents');
    if (!sourceLayout || !targetLayout) return;

    const sourceCol = sourceLayout.querySelector('.evamats-cart__col-main');
    const targetCol = targetLayout.querySelector('.evamats-cart__col-main');
    if (sourceCol && targetCol) {
      targetCol.innerHTML = sourceCol.innerHTML;
    }

    this.syncEvamatsCartSidebar(
      sourceLayout.querySelector('.evamats-cart-sidebar'),
      targetLayout.querySelector('.evamats-cart-sidebar')
    );
  }

  syncEvamatsCartSidebar(sourceSidebar, targetSidebar) {
    if (!sourceSidebar || !targetSidebar) return;

    const termsCheckbox = targetSidebar.querySelector('[data-cart-terms-checkbox]');
    const termsChecked = !!(termsCheckbox && termsCheckbox.checked);

    const sourceCount = sourceSidebar.querySelector('.evamats-cart-sidebar__count');
    const targetCount = targetSidebar.querySelector('.evamats-cart-sidebar__count');
    if (sourceCount && targetCount) {
      targetCount.textContent = sourceCount.textContent;
    }

    const sourceTotal = sourceSidebar.querySelector('.evamats-cart-sidebar__total-value');
    const targetTotal = targetSidebar.querySelector('.evamats-cart-sidebar__total-value');
    if (sourceTotal && targetTotal) {
      targetTotal.innerHTML = sourceTotal.innerHTML;
    }

    const sourceDiscounts = sourceSidebar.querySelector('#discountMessage');
    const targetDiscounts = targetSidebar.querySelector('#discountMessage');
    if (sourceDiscounts && targetDiscounts) {
      targetDiscounts.innerHTML = sourceDiscounts.innerHTML;
    }

    if (termsCheckbox && termsChecked) {
      termsCheckbox.checked = true;
    }
  }

  afterCartContentsUpdate() {
    if (window.restoreEvamatsCartTermsCheckbox) {
      window.restoreEvamatsCartTermsCheckbox();
    }
    if (window.initEvamatsCartReservationTimer) {
      window.initEvamatsCartReservationTimer();
    }
    if (window.initEvamatsCartSidebarControls) {
      window.initEvamatsCartSidebarControls();
    }
    document.querySelectorAll('.drawer__progress_products').forEach(function (upsellRoot) {
      if (window.initDrawerProgressUpsell) {
        window.initDrawerProgressUpsell(upsellRoot);
      }
    });
  }

  buildRestorePayload(lineItem) {
    const payload = {
      id: lineItem.variant_id,
      quantity: lineItem.quantity
    };

    if (lineItem.properties && typeof lineItem.properties === 'object') {
      const properties = {};
      Object.entries(lineItem.properties).forEach(([name, value]) => {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          properties[name] = value;
        }
      });
      if (Object.keys(properties).length > 0) {
        payload.properties = properties;
      }
    }

    const sellingPlanId = lineItem.selling_plan_allocation?.selling_plan?.id;
    if (sellingPlanId) {
      payload.selling_plan = sellingPlanId;
    }

    return payload;
  }

  createRemovedGhost(itemEl, lineKey, payload) {
    const ghost = itemEl.cloneNode(true);
    ghost.classList.add('evamats-cart-item--removed');
    ghost.dataset.restorePayload = JSON.stringify(payload);
    ghost.dataset.lineKey = lineKey;
    ghost.id = `CartItem-removed-${lineKey}`;
    ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    ghost.querySelectorAll('input, button.quantity__button').forEach((el) => {
      el.disabled = true;
    });
    return ghost;
  }

  appendRemovedGhosts() {
    const container = document.querySelector('.evamats-cart-items');
    if (!container || !this._removedGhosts) return;

    this._removedGhosts.forEach((ghost, lineKey) => {
      if (!container.querySelector(`[data-line-key="${lineKey}"].evamats-cart-item--removed`)) {
        container.appendChild(ghost);
      }
    });
  }

  async softRemoveLine(line, lineKey) {
    const itemEl = document.getElementById(`CartItem-${line}`);
    if (!itemEl) {
      await this.updateQuantity(line, 0);
      return;
    }

    let lineItem;
    try {
      const cart = await (await fetch('/cart.js')).json();
      lineItem = cart.items.find((item) => item.key === lineKey);
    } catch (err) {
      console.error(err);
      await this.updateQuantity(line, 0);
      return;
    }

    if (!lineItem) {
      await this.updateQuantity(line, 0);
      return;
    }

    if (!this._removedGhosts) {
      this._removedGhosts = new Map();
    }

    const payload = this.buildRestorePayload(lineItem);
    const ghost = this.createRemovedGhost(itemEl, lineKey, payload);
    this._removedGhosts.set(lineKey, ghost);

    await this.updateQuantity(line, 0, null, { lineKey, softRemove: true });
  }

  async restoreRemovedItem(itemEl) {
    let payload;
    try {
      payload = JSON.parse(itemEl.dataset.restorePayload || 'null');
    } catch (err) {
      payload = null;
    }

    if (!payload || !payload.id) return;

    const lineKey = itemEl.dataset.lineKey;
    itemEl.classList.add('is-restoring');

    try {
      const response = await fetch(`${routes.cart_add_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ items: [payload] })
      });

      if (!response.ok) {
        throw new Error('restore failed');
      }

      if (lineKey && this._removedGhosts) {
        this._removedGhosts.delete(lineKey);
      }
      itemEl.remove();
      await this.onCartUpdate();
    } catch (err) {
      console.error(err);
      itemEl.classList.remove('is-restoring');
    }
  }

  getSectionsToRender() {
    const sections = [
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
      }
    ];

    const cartFooter = document.getElementById('main-cart-footer');
    if (cartFooter && cartFooter.dataset.id) {
      sections.push({
        id: 'main-cart-footer',
        section: cartFooter.dataset.id,
        selector: '.js-contents'
      });
    }

    return sections;
  }

  async updateQuantity(line, quantity, name, options = {}) {
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

  const changePayload = options.lineKey
    ? { id: options.lineKey, quantity: parseInt(quantity, 10) }
    : { line, quantity: parseInt(quantity, 10) };

  const body = JSON.stringify({
    ...changePayload,
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

    const hasRemovedGhosts = this._removedGhosts && this._removedGhosts.size > 0;
    const cartIsEmpty = freshCart.item_count === 0 && !hasRemovedGhosts;

    this.classList.toggle('is-empty', cartIsEmpty);
    if (cartIsEmpty && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('evamatsCartTermsAccepted');
    }
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const cartFooter = document.getElementById('main-cart-footer');

    if (cartFooter) cartFooter.classList.toggle('is-empty', cartIsEmpty);
    if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', cartIsEmpty);

    this.getSectionsToRender().forEach(section => {
      if (section.id === 'main-cart-items') {
        this.applyMainCartItemsSection(sectionsData[section.section]);
        return;
      }

      const elementToReplace =
        document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
      elementToReplace.innerHTML = this.getSectionInnerHTML(sectionsData[section.section], section.selector);
    });

    this.appendRemovedGhosts();

    publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items' });

    this.afterCartContentsUpdate();
  } catch (err) {
    console.error(err);
    if (options.softRemove && options.lineKey && this._removedGhosts) {
      this._removedGhosts.delete(options.lineKey);
    }
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
