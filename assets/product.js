
class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this._priceSyncTimers = [];
    this._schedulePriceSync = () => {
      this._priceSyncTimers.forEach((id) => clearTimeout(id));
      this._priceSyncTimers = [];

      const scope = this.getProductPriceScope?.() || document;
      const isSimpleProduct = this.closest('.evamats-product-simple');
      const delays = isSimpleProduct
        ? [0]
        : this.hasDmixerDiscountedPrice?.(scope)
          ? [350, 900, 1600]
          : [750];

      delays.forEach((delay) => {
        const id = setTimeout(() => this.updatePrices(), delay);
        this._priceSyncTimers.push(id);
      });
    };

    if (typeof subscribe === 'function') {
      subscribe(PUB_SUB_EVENTS.variantChange, () => {
        this._schedulePriceSync();
      });
    }

    document.addEventListener('evamats:discount-updated', () => {
      this._schedulePriceSync();
    });

    window.addEventListener('load', () => {
      this._schedulePriceSync();
    });
  }

  getProductPriceScope() {
    return (
      this.closest('.product__info-wrapper') ||
      this.closest('.product') ||
      this.closest('[id^="shopify-section"]') ||
      document
    );
  }

  formatMoneyLikeDisplay(cents, referenceHTML) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = referenceHTML || '';
    const plain = (wrapper.textContent || '').trim();
    const currency = plain.replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
    const amount = Number(cents) / 100;
    if (!amount) return '';
    const locale = document.documentElement.lang || undefined;
    const formatted = Number(amount.toFixed(2)).toLocaleString(locale, { maximumFractionDigits: 2 });
    return `${formatted} ${currency}`.trim();
  }

  findDmixerCompareElement(host, shadowRoot, wrapper, saleText) {
    const saleNormalized = (saleText || '').replace(/\s+/g, ' ').trim();

    const shadowSelectors = [
      '.dmixer-dp-original-price',
      '.dmixer-dp-compare',
      '.dmixer-dp-original',
      '[class*="original"]',
      's',
      'del',
    ];
    for (const selector of shadowSelectors) {
      const el = shadowRoot.querySelector(selector);
      if (el && el.textContent.trim() && el.textContent.replace(/\s+/g, ' ').trim() !== saleNormalized) {
        return el;
      }
    }

    for (const el of shadowRoot.querySelectorAll('*')) {
      if (!el.textContent.trim() || el === shadowRoot.querySelector('.dmixer-dp-price')) continue;
      const decoration = window.getComputedStyle(el).textDecorationLine;
      if (decoration.includes('line-through') && el.textContent.replace(/\s+/g, ' ').trim() !== saleNormalized) {
        return el;
      }
    }

    if (!wrapper) return null;

    const lightSelectors = [
      '.dmixer-original-price',
      '.dmixer-dp-original-price',
      '[class*="original"]',
      's',
      'del',
      '.price-item--regular',
    ];
    for (const selector of lightSelectors) {
      const el = wrapper.querySelector(selector);
      if (el && !el.closest('dmixer-discounted-price') && el.textContent.trim()) {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (text !== saleNormalized) return el;
      }
    }

    const priceBox = host.closest('.dmixer-price') || wrapper.querySelector('.dmixer-price');
    if (priceBox) {
      for (const child of priceBox.children) {
        if (child.tagName === 'DMIXER-DISCOUNTED-PRICE' || child.contains(host)) continue;
        const text = child.textContent.replace(/\s+/g, ' ').trim();
        if (text && text !== saleNormalized) return child;
      }
    }

    return null;
  }

  getDmixerPricesFromShadow(scope) {
    const hosts = scope.querySelectorAll('dmixer-discounted-price');
    for (const host of hosts) {
      const shadowRoot = host.shadowRoot;
      if (!shadowRoot) continue;

      const saleEl = shadowRoot.querySelector('.dmixer-dp-price');
      if (!saleEl || !saleEl.textContent.trim()) continue;

      const saleHTML = saleEl.innerHTML.trim() || saleEl.textContent.trim();
      const wrapper =
        host.closest('.dmixer-price-wrapper, .dmixer-price') ||
        scope.querySelector('.dmixer-price-wrapper, .dmixer-price, #google_prices, .main_price');

      const compareEl = this.findDmixerCompareElement(host, shadowRoot, wrapper, saleHTML);
      let compareHTML =
        compareEl && compareEl.textContent.trim()
          ? compareEl.innerHTML.trim() || compareEl.textContent.trim()
          : null;

      if (!compareHTML && this.currentVariant?.price) {
        compareHTML = this.formatMoneyLikeDisplay(this.currentVariant.price, saleHTML);
      }

      return { saleHTML, compareHTML };
    }

    return null;
  }

  hasDmixerDiscountedPrice(scope) {
    return scope.querySelector('dmixer-discounted-price') !== null;
  }

  formatSimpleVariantMoney(cents, referenceHTML) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }
    return this.formatMoneyLikeDisplay(cents, referenceHTML);
  }

  getDisplayedProductPrices() {
    const simpleRoot = this.closest('.evamats-product-simple');
    if (simpleRoot) {
      if (!this.currentVariant) {
        this.updateOptions();
        this.updateMasterId();
      }
      if (this.currentVariant) {
        const reference =
          simpleRoot.querySelector('.evamats-product-checkout__price-current')?.textContent || '';
        const saleHTML = this.formatSimpleVariantMoney(this.currentVariant.price, reference);
        let compareHTML = null;
        const compareAt = this.currentVariant.compare_at_price;
        if (compareAt && compareAt > this.currentVariant.price) {
          compareHTML = this.formatSimpleVariantMoney(compareAt, saleHTML);
        }
        return { saleHTML, compareHTML };
      }
    }

    const scope = this.getProductPriceScope();

    const dmixerPrices = this.getDmixerPricesFromShadow(scope);
    if (dmixerPrices) {
      return dmixerPrices;
    }

    const evamatsRoot = scope.querySelector('[data-evamats-discount]:not([hidden])');
    if (evamatsRoot) {
      const saleEl = evamatsRoot.querySelector('[data-evamats-sale]');
      const compareEl = evamatsRoot.querySelector('[data-evamats-compare]');
      if (saleEl && saleEl.textContent.trim()) {
        return {
          saleHTML: saleEl.innerHTML,
          compareHTML: compareEl && compareEl.textContent.trim() ? compareEl.innerHTML : null,
        };
      }
    }

    const mainPrice = scope.querySelector('.main_price') || scope.querySelector('#google_prices');
    if (!mainPrice) {
      return { saleHTML: '', compareHTML: null };
    }

    const mixerPrice = mainPrice.querySelector('.dmixer-price .price-item');
    const mixerCompare = mainPrice.querySelector('.dmixer-original-price');
    if (mixerPrice && mixerPrice.textContent.trim()) {
      return {
        saleHTML: mixerPrice.innerHTML,
        compareHTML: mixerCompare && mixerCompare.textContent.trim() ? mixerCompare.innerHTML : null,
      };
    }

    const priceRoot = mainPrice.querySelector('.price') || mainPrice;
    const onSale = priceRoot.classList.contains('price--on-sale');
    const saleEl = onSale
      ? priceRoot.querySelector('.price-item--sale, .price-item--last')
      : priceRoot.querySelector('.price__regular .price-item--regular, .price-item--regular');
    const compareEl = onSale
      ? priceRoot.querySelector('.price__sale s.price-item--regular, .price__sale .price-item--regular')
      : null;

    return {
      saleHTML: saleEl ? saleEl.innerHTML : '',
      compareHTML: compareEl && compareEl.textContent.trim() ? compareEl.innerHTML : null,
    };
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    // this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      // this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      if (!this.closest('.config_container')) {
        this.updateMedia();
      }
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach(mediaGallery => mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true));

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    if (!this.currentVariant) return;
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input =
        productForm.querySelector('input.product-variant-id[name="id"]') ||
        productForm.querySelector('input[name="id"]');
      if (!input) return;
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const firstChecked = this.querySelector(':checked');
    if (!firstChecked || !this.variantData) return;
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => firstChecked.value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')]
      const prevChecked = inputWrappers[index - 1].querySelector(':checked');
      if (!prevChecked) return;
      const previousOptionSelected = prevChecked.value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter(variant => variant.available && variant[`option${index}`] === previousOptionSelected).map(variantOption => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue)
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
  }

  updatePrices() {
    const stickyConfigPriceElement = document.querySelector('.sticky_container');
    const stickyConfigPriceElementPrice = document.querySelector('.sticky_config_price_price');
    const buttonsPrice = document.querySelectorAll('.button_price');
    const upsellItemsCheckboxes = document.querySelectorAll('.product__upsell_custom_checkbox input[type="checkbox"]:checked');

    let upsellTotal = 0;
    upsellItemsCheckboxes.forEach(checkbox => {
      upsellTotal += parseFloat(checkbox.dataset.price) / 100 || 0;
    });

    const { saleHTML, compareHTML } = this.getDisplayedProductPrices();
    if (!saleHTML) return;

    const simpleRoot = this.closest('.evamats-product-simple');

    const parsePriceFromHTML = (htmlString) => {
      const doc = document.createElement('div');
      doc.innerHTML = htmlString || '';
      let compact = (doc.textContent || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s/g, '')
        .replace(/[^\d.,-]/g, '');
      if (!compact) return 0;
      const neg = compact.startsWith('-');
      if (neg) compact = compact.slice(1);

      const lastDot = compact.lastIndexOf('.');
      const lastComma = compact.lastIndexOf(',');
      let num = 0;
      if (lastDot === -1 && lastComma === -1) {
        num = parseFloat(compact) || 0;
      } else if (lastDot > lastComma) {
        num = parseFloat(compact.replace(/,/g, '')) || 0;
      } else {
        num = parseFloat(compact.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return neg ? -num : num;
    };

    const getSumHTML = (htmlString, addValue) => {
      const numericValue = parsePriceFromHTML(htmlString);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = htmlString || '';
      const plain = (wrapper.textContent || '').trim();
      const currency = plain.replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
      const sum = numericValue + addValue;
      const locale = document.documentElement.lang || undefined;
      const formatted = Number(sum.toFixed(2)).toLocaleString(locale, { maximumFractionDigits: 2 });
      return `${formatted} ${currency}`.trim();
    };

    const totalHTML =
      simpleRoot && upsellTotal === 0 ? saleHTML : getSumHTML(saleHTML, upsellTotal);
    const buttonPrice = document.querySelectorAll('.product__info-wrapper .button_price');
    const optionPrice = document.querySelector('.option__price_regular');
    const optionPriceCompareEls = document.querySelectorAll('.option__price_compare');

    if (stickyConfigPriceElementPrice) {
      stickyConfigPriceElementPrice.innerHTML = totalHTML;
    }
    buttonPrice.forEach((button) => {
      button.innerHTML = totalHTML;
    });
    buttonsPrice.forEach((button) => {
      button.innerHTML = totalHTML;
    });

    if (simpleRoot) {
      const simpleCompareEl = simpleRoot.querySelector('.evamats-product-checkout__price-old');
      if (simpleCompareEl) {
        if (compareHTML) {
          simpleCompareEl.classList.remove('hidden');
          simpleCompareEl.innerHTML = compareHTML;
        } else {
          simpleCompareEl.classList.add('hidden');
          simpleCompareEl.innerHTML = '';
        }
      }
    }

    if (optionPrice) {
      optionPrice.innerHTML = saleHTML;
    }
    if (optionPriceCompareEls.length) {
      let fullPriceHTML = compareHTML;

      if (!fullPriceHTML && this.currentVariant?.price) {
        const saleNum = parsePriceFromHTML(saleHTML);
        const variantNum = this.currentVariant.price / 100;
        if (variantNum > saleNum) {
          const candidateHTML = this.formatMoneyLikeDisplay(this.currentVariant.price, saleHTML);
          const normalizePriceText = (html) =>
            (html || '')
              .replace(/<[^>]*>/g, '')
              .replace(/\u00A0/g, ' ')
              .replace(/\s/g, '')
              .trim();
          if (normalizePriceText(candidateHTML) !== normalizePriceText(saleHTML)) {
            fullPriceHTML = candidateHTML;
          }
        }
      }

      optionPriceCompareEls.forEach((optionPriceCompare) => {
        if (fullPriceHTML) {
          optionPriceCompare.classList.remove('hidden');
          optionPriceCompare.innerHTML = fullPriceHTML;
          optionPrice?.classList.add('option__price_regular--sale');
        } else {
          optionPriceCompare.classList.add('hidden');
          optionPriceCompare.innerHTML = '';
          optionPrice?.classList.remove('option__price_regular--sale');
        }
      });
    }

    document.dispatchEvent(new CustomEvent('evamats:discount-updated'));

    if (stickyConfigPriceElement && !stickyConfigPriceElement.closest('.evamats-config')) {
      stickyConfigPriceElement.removeAttribute('style');
      stickyConfigPriceElement.style.width = stickyConfigPriceElement.offsetWidth + 1 + 'px';
    }
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(`${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(`price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const skuSource = html.getElementById(`Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(`Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('visibility-hidden', skuSource.classList.contains('visibility-hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        if (inventoryDestination) inventoryDestination.classList.toggle('visibility-hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant
          }
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
    if (inventory) inventory.classList.add('visibility-hidden');
    if (sku) sku.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset')).filter((fieldset) => {
      return fieldset.querySelector('input[type="radio"]:not([name^="properties["])');
    });
    this.options = fieldsets.map((fieldset) => {
      const checked = Array.from(
        fieldset.querySelectorAll('input[type="radio"]:not([name^="properties["])')
      ).find((radio) => radio.checked);
      return checked ? checked.value : undefined;
    });
  }
}

customElements.define('variant-radios', VariantRadios);

// reverse years in select on product
(function () {
  document.addEventListener("DOMContentLoaded", function() {
    const select = document.getElementById("rok-produkcji");
    if (select) {
        // Берём все option, кроме первого
        const firstOption = select.options[0];
        const options = Array.from(select.options).slice(1);

        // Реверсим список годов
        options.reverse();

        // Чистим select и возвращаем первый option "Please select"
        select.innerHTML = "";
        select.appendChild(firstOption);

        // Добавляем обратно перевёрнутые года
        options.forEach(option => select.appendChild(option));

        // Гарантируем, что выбран "Please select"
        firstOption.selected = true;
    }
  });
})();

// reverse years in select on product


// swiper cart notification

(function () {
    if (document.querySelector('.related_product__list')) {
        const cartSwiper = new Swiper('.related_product__list', {
            spaceBetween: 10,
            slidesPerView: 2,
            // If we need pagination
          
            // Navigation arrows
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                800: {
                  slidesPerView: 2
                },
                1024: {
                  slidesPerView: 3
                },
              }
          });
    }
})();
// swiper cart notification

// toggle galleries on change mats type inputs
(function () {
    function initMatsTypeGalleryToggle() {
      const radioButtons = document.querySelectorAll('fieldset[data-name="mats_type"] input[type="radio"]');
      const mediaGalleryWithoutEdges = document.querySelector('.product__media_without_edges');
      const mediaGalleryWithEdges = document.querySelector('.product__media_with_edges');

      if (!radioButtons.length || !mediaGalleryWithoutEdges || !mediaGalleryWithEdges) return;

      const clickSecondImage = (index) => {
        const gallery = Number(index) === 1 ? mediaGalleryWithoutEdges : mediaGalleryWithEdges;
        const thumbnail = gallery.querySelectorAll('.thumbnail')[1];
        if (thumbnail) thumbnail.click();
      };

      const applyMatsTypeGallery = (index, selectSecondSlide) => {
        const idx = Number(index);
        if (idx === 1) {
          mediaGalleryWithoutEdges.classList.add('active');
          mediaGalleryWithEdges.classList.remove('active');
        } else if (idx === 2) {
          mediaGalleryWithoutEdges.classList.remove('active');
          mediaGalleryWithEdges.classList.add('active');
        } else {
          return;
        }

        if (selectSecondSlide) {
          requestAnimationFrame(() => clickSecondImage(idx));
        }
      };

      radioButtons.forEach((radio) => {
        radio.addEventListener('change', function () {
          applyMatsTypeGallery(this.dataset.index, true);
        });
      });

      const checkedRadio = document.querySelector('fieldset[data-name="mats_type"] input[type="radio"]:checked');
      if (checkedRadio) {
        applyMatsTypeGallery(checkedRadio.dataset.index, true);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMatsTypeGalleryToggle);
    } else {
      initMatsTypeGalleryToggle();
    }
  })();
// toggle size product config mobile
(function () {
    const toggler = document.querySelector('.product__config__toggle_size')
    const container = document.querySelector('.sticky_config_price')
    const parentContainer = document.querySelector('.sticky_config_container')
    const image = document.querySelector('.product__config_image--mobile_image')
    if (toggler) {
      toggler.addEventListener('click', () => {
        toggler.classList.toggle('active')
        container.classList.toggle('wide')
        parentContainer.classList.toggle('wide')
        container.removeAttribute('style')
      })
      if (image) {
        image.addEventListener('click', () => {
          toggler.classList.toggle('active')
          parentContainer.classList.toggle('wide')
          container.removeAttribute('style')
        })
      }
    }
  })();
  // toggle size product config mobile

// bounce config image mobile after change option
(function () {
  const image = document.querySelector('.sticky_config_price .product__config_image--mobile img') || document.querySelector('.product__config_image--mobile_image')
  const options = document.querySelectorAll('.product__info-wrapper [data-name="mats_type"] input')

  if (image) {
    options.forEach(el => {
      el.addEventListener('change', () => {
        image.classList.add('animate__bounce')
        setTimeout(() => {
          
          image.classList.remove('animate__bounce')
        }, 1000);
      })
    })   
  }
})();
// bounce config image mobile after change option




// product sticky price
(function () {
  if (document.querySelector('[data-evamats-config-step-bar]')) return;

  const mainPriceElement = document.querySelector('.main_price');
  const stickyConfigPriceElement = document.querySelector('.sticky_container');

  if (stickyConfigPriceElement && window.innerWidth > 767) {
      // Создаем наблюдатель
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
          if (!entry.isIntersecting) {
              // Если элемент не виден, добавляем класс active
              stickyConfigPriceElement.classList.add('active');
          } else {
              // Если элемент виден, убираем класс active
              stickyConfigPriceElement.classList.remove('active');
          }
          });
      });
      
      window.addEventListener('load', () => {
          if (!stickyConfigPriceElement.closest('.evamats-config')) {
            stickyConfigPriceElement.style.width = stickyConfigPriceElement.offsetWidth + 1 + 'px';
          }
      })
      
      // Начинаем наблюдение за основным элементом
      if (mainPriceElement) {
          observer.observe(mainPriceElement);
      }
  } else if (stickyConfigPriceElement) {
    stickyConfigPriceElement.classList.add('active');
  }

})();
// product sticky price


(function () {
  const addToCartButton = document.querySelector('.sticky_add_to_cart');
  if (!addToCartButton) return;

  addToCartButton.addEventListener('click', function () {

    const target = document.querySelector('#uwagi-do-zamowienia');
    if (target) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 300; // -300 пикселей вверх
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    }
    const submitButton = document.querySelector('.product-form__submit');
    if (submitButton) submitButton.click();
  })
})();

// product tabs
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector(".evamats-product-tabs");
    if (!root) return;

    const tabs = root.querySelectorAll(".product_tabs__item");
    const containers = root.querySelectorAll(".product_tabs__containers_item");
    const descriptionSections = document.querySelectorAll(".image-with-text--description");

    function switchTab(activeId) {
        tabs.forEach(tab => {
          tab.classList.remove("active");
          tab.setAttribute("aria-selected", "false");
        });
        containers.forEach(container => container.classList.remove("active"));

        const activeTab = root.querySelector(`.product_tabs__item[data-id="${activeId}"]`);
        const activeContainer = root.querySelector(`.product_tabs__containers_item[data-id="${activeId}"]`);

        if (activeTab) {
          activeTab.classList.add("active");
          activeTab.setAttribute("aria-selected", "true");
        }
        if (activeContainer) activeContainer.classList.add("active");

        descriptionSections.forEach(section => {
            if (activeId === "description") {
                section.style.display = "";
            } else {
                section.style.display = "none";
            }
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const id = tab.getAttribute("data-id");
            switchTab(id);
        });
    });

    const firstTab = tabs[0];
    if (firstTab) {
        const id = firstTab.getAttribute("data-id");
        switchTab(id);
    }
  });
})();
// product tabs