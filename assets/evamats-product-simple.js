(function () {
  const root = document.querySelector('.evamats-product-simple');
  if (!root) return;

  const amountFieldset = root.querySelector('#gift-card-amount');
  const variantRadios = root.querySelector('variant-radios');

  function getVariants() {
    if (!variantRadios) return [];
    const script = variantRadios.querySelector('script[type="application/json"]');
    if (!script) return [];
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  function formatMoneyLikeDisplay(cents, referenceText) {
    const plain = (referenceText || '').trim();
    const currency = plain.replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
    const amount = Number(cents) / 100;
    if (!amount) return '';
    const locale = document.documentElement.lang || undefined;
    const formatted = Number(amount.toFixed(2)).toLocaleString(locale, {
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`.trim();
  }

  function formatMoney(cents) {
    const reference =
      root.querySelector('.evamats-config-checkout__price-current, .evamats-product-checkout__price-current')?.textContent ||
      root.querySelector('.price-item--regular')?.textContent ||
      '';

    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }

    return formatMoneyLikeDisplay(cents, reference);
  }

  function getSelectedCardTypeValue(amountPosition) {
    const typePosition = amountPosition === 1 ? 2 : 1;
    const fieldsets = root.querySelectorAll('fieldset.evamats-product-option');

    for (const fieldset of fieldsets) {
      if (fieldset.id === 'gift-card-amount') continue;
      const position = Number(fieldset.dataset.optionPosition || 0);
      if (position !== typePosition) continue;

      const input = fieldset.querySelector('input[type="radio"]:checked');
      return input ? input.value : null;
    }

    const variants = getVariants();
    const currentVariantId = root.querySelector('input[name="id"]')?.value;
    const currentVariant = variants.find((variant) => String(variant.id) === String(currentVariantId));
    if (!currentVariant) return null;

    if (typePosition === 1) return currentVariant.option1;
    if (typePosition === 2) return currentVariant.option2;
    return currentVariant.option3;
  }

  function findGiftAmountVariant(amountValue, amountPosition, cardTypeValue) {
    if (!cardTypeValue || !amountValue) return null;

    return getVariants().find((variant) => {
      if (amountPosition === 1) {
        return variant.option1 === amountValue && variant.option2 === cardTypeValue;
      }
      if (amountPosition === 2) {
        return variant.option2 === amountValue && variant.option1 === cardTypeValue;
      }
      return variant.option3 === amountValue;
    });
  }

  function updateGiftAmountLabels() {
    if (!amountFieldset) return;

    const amountPosition = Number(amountFieldset.dataset.amountPosition || 2);
    const cardTypeValue = getSelectedCardTypeValue(amountPosition);

    amountFieldset.querySelectorAll('[data-gift-amount-value]').forEach((label) => {
      const amountValue = label.dataset.giftAmountValue;
      const variant = findGiftAmountVariant(amountValue, amountPosition, cardTypeValue);
      label.textContent = variant ? formatMoney(variant.price) : amountValue;
    });
  }

  function syncAmountLegend(input) {
    if (!amountFieldset || !input) return;

    const valueEl = amountFieldset.querySelector('.lip__title_value');
    if (!valueEl) return;

    const amountPosition = Number(amountFieldset.dataset.amountPosition || 2);
    const cardTypeValue = getSelectedCardTypeValue(amountPosition);
    const variant = findGiftAmountVariant(input.value, amountPosition, cardTypeValue);

    if (variant) {
      valueEl.textContent = formatMoney(variant.price);
      return;
    }

    const variants = getVariants();
    const currentVariantId = root.querySelector('input[name="id"]')?.value;
    const currentVariant = variants.find((item) => String(item.id) === String(currentVariantId));
    if (currentVariant && input.checked) {
      valueEl.textContent = formatMoney(currentVariant.price);
      return;
    }

    const label =
      input.nextElementSibling?.querySelector?.('.evamats-product-option__amount-label') ||
      amountFieldset.querySelector('.evamats-product-option__amount-label');
    if (label?.textContent?.trim()) {
      valueEl.textContent = label.textContent.trim();
    }
  }

  function syncOptionValue(input) {
    const fieldset = input.closest('fieldset.evamats-product-option');
    if (!fieldset) return;

    if (fieldset.id === 'gift-card-amount') {
      syncAmountLegend(input);
      return;
    }

    const valueEl = fieldset.querySelector('.lip__title_value');
    if (!valueEl) return;

    const title = input.getAttribute('data-title') || input.value;
    valueEl.textContent =
      typeof window.evamatsStripBrandLabel === 'function'
        ? window.evamatsStripBrandLabel(title)
        : String(title || '')
            .replace(/\s*(?:EVAMATS|Carvion)\s*/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
  }

  if (amountFieldset) {
    updateGiftAmountLabels();
    const amountInput = amountFieldset.querySelector('input[type="radio"]:checked');
    if (amountInput) syncAmountLegend(amountInput);
  }

  root.querySelectorAll('fieldset.evamats-product-option input[type="radio"]').forEach((input) => {
    if (input.checked && input.closest('#gift-card-amount') === null) {
      syncOptionValue(input);
    }

    input.addEventListener('change', () => {
      if (amountFieldset) updateGiftAmountLabels();

      if (input.closest('#gift-card-amount')) {
        syncAmountLegend(input);
        return;
      }

      syncOptionValue(input);

      if (amountFieldset) {
        const amountInput = amountFieldset.querySelector('input[type="radio"]:checked');
        if (amountInput) syncAmountLegend(amountInput);
      }
    });
  });

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, () => {
      if (amountFieldset) {
        updateGiftAmountLabels();
        const amountInput = amountFieldset.querySelector('input[type="radio"]:checked');
        if (amountInput) syncAmountLegend(amountInput);
      }
    });
  }
})();
