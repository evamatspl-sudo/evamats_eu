(function () {
  const root = document.querySelector('.evamats-gift-card-description');
  if (!root) return;

  const variantsScript = root.querySelector('[data-gift-card-variants-json]');
  let variants = [];

  try {
    variants = JSON.parse(variantsScript?.textContent || '[]');
  } catch (error) {
    variants = [];
  }

  const amountPosition = Number(root.dataset.amountPosition || 2);
  const cardTypePosition = Number(root.dataset.cardTypePosition || 1);
  const amountOptionName = root.dataset.amountOptionName || 'Amount';
  const cardTypeOptionName = root.dataset.cardTypeOptionName || 'Card type';
  const productRoot = document.querySelector('.evamats-product-simple');

  function getOptionValue(variant, position) {
    if (position === 1) return variant.option1;
    if (position === 2) return variant.option2;
    return variant.option3;
  }

  function getOptionFieldset(position) {
    if (!productRoot || !position) return null;
    const fieldsets = productRoot.querySelectorAll('fieldset.evamats-product-option');
    for (const fieldset of fieldsets) {
      if (Number(fieldset.dataset.optionPosition) === position) {
        return fieldset;
      }
    }
    return null;
  }

  function getSelectedOptionValue(position) {
    const fieldset = getOptionFieldset(position);
    const input = fieldset?.querySelector('input[type="radio"]:checked');
    return input ? input.value : null;
  }

  function findAmountInput(amount) {
    const fieldset = document.getElementById('gift-card-amount') || getOptionFieldset(amountPosition);
    if (!fieldset || !amount) return null;

    const inputs = fieldset.querySelectorAll('input[type="radio"]');
    for (const input of inputs) {
      if (input.value === amount) return input;
    }

    return null;
  }

  function findVariant(cardType, amount) {
    if (!cardType || !amount) return null;
    return variants.find((variant) => {
      const variantCardType = getOptionValue(variant, cardTypePosition);
      const variantAmount = getOptionValue(variant, amountPosition);
      return variantCardType === cardType && variantAmount === amount;
    });
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
      productRoot?.querySelector('.evamats-product-checkout__price-current')?.textContent ||
      productRoot?.querySelector('.price-item--regular')?.textContent ||
      '';

    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }

    return formatMoneyLikeDisplay(cents, reference);
  }

  function updatePrices() {
    const cardType = getSelectedOptionValue(cardTypePosition);
    root.querySelectorAll('.evamats-gift-card-description__card').forEach((card) => {
      const amount = card.dataset.giftAmount;
      const priceEl = card.querySelector('.evamats-gift-card-description__price');
      if (!priceEl || !amount) return;

      const variant = findVariant(cardType, amount);
      priceEl.textContent = variant ? formatMoney(variant.price) : priceEl.textContent;
    });
    syncSelectedCard();
  }

  function syncSelectedCard() {
    const amount = getSelectedOptionValue(amountPosition);
    root.querySelectorAll('.evamats-gift-card-description__card').forEach((card) => {
      card.classList.toggle('is-selected', card.dataset.giftAmount === amount);
    });
  }

  function scrollToAmountPicker() {
    const target =
      document.getElementById('gift-card-amount') ||
      document.querySelector('[id^="MainProduct-"]') ||
      productRoot;

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectAmount(amount) {
    if (!productRoot || !amount) return;

    const input = findAmountInput(amount);

    if (!input || input.disabled) return;

    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      updatePrices();
    }
  }

  root.querySelectorAll('.evamats-gift-card-description__card').forEach((card) => {
    card.addEventListener('click', () => {
      selectAmount(card.dataset.giftAmount);
      scrollToAmountPicker();
    });
  });

  if (productRoot) {
    productRoot.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'radio') return;
      const amountFieldset = getOptionFieldset(amountPosition);
      const cardTypeFieldset = getOptionFieldset(cardTypePosition);
      if (amountFieldset?.contains(target) || cardTypeFieldset?.contains(target)) {
        updatePrices();
      }
    });
  }

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, updatePrices);
  }

  updatePrices();
})();
