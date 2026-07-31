// product upsell variant buttons - поддержка товаров с опциями и без (инициализация при появлении секции в viewport)
(function () {
  const upsellContainer = document.querySelector('.product__upsell');
  if (!upsellContainer) return;

  function initUpsellVariants() {
    function getSizedImageUrl(src, size) {
      if (!src) return src;
      return src;
    }

    const upsellItems = document.querySelectorAll('.product__upsell_item');

    upsellItems.forEach(upsellItem => {
      const buttons = upsellItem.querySelectorAll('.product__upsell_item_variant');
      const checkbox = upsellItem.querySelector('input[name="product__upsell"]');
      const variantsJson = upsellItem.dataset.variants;
      const zoomImg = upsellItem.querySelector('.product__upsell_image_zoom');
      const priceEl = upsellItem.querySelector('.product__upsell_price');

      if (!checkbox || !variantsJson) {
        console.warn('Missing checkbox or variants for:', upsellItem);
        return;
      }

      const variants = JSON.parse(variantsJson);

      if (!buttons.length) {
        return;
      }

      function updateZoomImageForSize() {
        if (!zoomImg) return;
        const sizeGroup = Array.from(upsellItem.querySelectorAll('.option-group')).find((group) => {
          const groupName = ((group.dataset.group || '') + '').toLowerCase();
          return groupName.includes('size') || groupName.includes('rozmiar') || groupName.includes('gro');
        });
        if (!sizeGroup) return;
        const activeSize = sizeGroup.querySelector('.product__upsell_item_variant.active');
        const selected = ((activeSize?.dataset?.value) || '').trim().toUpperCase();
        const defaultSrc = zoomImg.dataset.imageDefault || zoomImg.getAttribute('src');
        const xlSrc = zoomImg.dataset.imageXl || defaultSrc;
        zoomImg.setAttribute('src', selected === 'XL' ? xlSrc : defaultSrc);
      }

      function formatUpsellPrice(cents) {
        if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
          return window.Shopify.formatMoney(cents);
        }
        const currency = (priceEl?.textContent || '').replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
        const amount = (Number(cents) || 0) / 100;
        return `${amount.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`.trim();
      }

      function updateUpsellPrice(cents, variant) {
        const priceRow = upsellItem.querySelector('.product__upsell_price-row');
        const regularEl = priceRow?.querySelector('.product__upsell_price') || priceEl;
        const compareEl = priceRow?.querySelector('.product__upsell_price_compare');
        const discountEl = priceRow?.querySelector('.product__upsell_discount');

        if (regularEl) {
          regularEl.textContent = formatUpsellPrice(cents);
        } else if (priceEl) {
          priceEl.textContent = formatUpsellPrice(cents);
        }

        if (!compareEl || !discountEl) return;

        const compareCents = variant?.compare_at_price;
        if (compareCents && compareCents > cents) {
          compareEl.textContent = formatUpsellPrice(compareCents);
          compareEl.classList.remove('hidden');
          const discountValueEl = discountEl.querySelector('.product__upsell_discount__value');
          (discountValueEl || discountEl).textContent = `-${Math.round(((compareCents - cents) / compareCents) * 100)}%`;
          discountEl.classList.remove('hidden');
        } else {
          compareEl.classList.add('hidden');
          discountEl.classList.add('hidden');
        }
      }

      function updateCheckbox() {
        const selectedOptions = {};
        const groups = upsellItem.querySelectorAll('.option-group');

        groups.forEach(group => {
          const optionIndex = parseInt(group.dataset.optionIndex, 10) + 1;
          const activeButton = group.querySelector('.product__upsell_item_variant.active');
          if (activeButton) {
            selectedOptions[`option${optionIndex}`] = activeButton.dataset.value;
          }
        });

        const matchingVariant = variants.find(variant => {
          return Object.keys(selectedOptions).every(key => variant[key] === selectedOptions[key]);
        });

        if (matchingVariant) {
          checkbox.value = matchingVariant.id;
          checkbox.dataset.price = matchingVariant.price;
          updateUpsellPrice(matchingVariant.price, matchingVariant);

          if (matchingVariant.featured_image && matchingVariant.featured_image.src) {
            const src = matchingVariant.featured_image.src;
            const mainImg = upsellItem.querySelector('.product__upsell_image');
            if (mainImg) {
              mainImg.src = getSizedImageUrl(src, 300);
            }
          }
        } else {
          checkbox.value = variants[0].id;
          checkbox.dataset.price = variants[0].price;
          updateUpsellPrice(variants[0].price, variants[0]);
          if (variants[0].featured_image && variants[0].featured_image.src) {
            const src = variants[0].featured_image.src;
            const mainImg = upsellItem.querySelector('.product__upsell_image');
            if (mainImg) {
              mainImg.src = getSizedImageUrl(src, 300);
            }
          }
        }
        updateZoomImageForSize();
      }

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const groupContainer = btn.closest('.option-group');
          if (!groupContainer) return;

          const currentItem = btn.closest('.product__upsell_item');
          if (!currentItem) return;

          groupContainer.querySelectorAll('.product__upsell_item_variant').forEach(el => el.classList.remove('active'));

          // "Mounted" option can be selected only for one heel item.
          const value = (btn.dataset.value || '').trim();
          const isMountOption = btn.classList.contains('montaz-option');
          const isMounted = isMountOption && value.includes('+');

          if (isMounted) {
            document.querySelectorAll('.product__upsell_item').forEach(item => {
              if (item === currentItem) return;

              const mountGroup = item.querySelector('.option-group .montaz-option')?.closest('.option-group');
              if (!mountGroup) return;

              const mountedBtn = Array.from(mountGroup.querySelectorAll('.product__upsell_item_variant'))
                .find(el => (el.dataset.value || '').includes('+'));
              const unmountedBtn = Array.from(mountGroup.querySelectorAll('.product__upsell_item_variant'))
                .find(el => !(el.dataset.value || '').includes('+'));

              if (!mountedBtn || !unmountedBtn) return;

              mountedBtn.classList.remove('active');
              unmountedBtn.classList.add('active');

              const otherCheckbox = item.querySelector('input[name="product__upsell"]');
              const otherVariants = JSON.parse(item.dataset.variants || '[]');
              const otherGroups = item.querySelectorAll('.option-group');
              const otherSelected = {};

              otherGroups.forEach(group => {
                const idx = parseInt(group.dataset.optionIndex, 10) + 1;
                const active = group.querySelector('.product__upsell_item_variant.active');
                if (active) otherSelected[`option${idx}`] = active.dataset.value;
              });

              const otherMatch = otherVariants.find(v => Object.keys(otherSelected).every(k => v[k] === otherSelected[k]));
              if (otherCheckbox && otherMatch) {
                otherCheckbox.value = otherMatch.id;
                otherCheckbox.dataset.price = otherMatch.price;
                const otherPriceEl = item.querySelector('.product__upsell_price');
                const otherPriceRow = item.querySelector('.product__upsell_price-row');
                const otherRegularEl = otherPriceRow?.querySelector('.product__upsell_price') || otherPriceEl;
                const otherCompareEl = otherPriceRow?.querySelector('.product__upsell_price_compare');
                const otherDiscountEl = otherPriceRow?.querySelector('.product__upsell_discount');
                if (otherRegularEl) {
                  if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
                    otherRegularEl.textContent = window.Shopify.formatMoney(otherMatch.price);
                  } else {
                    const otherCurrency = (otherRegularEl.textContent || '').replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
                    const otherAmount = (Number(otherMatch.price) || 0) / 100;
                    otherRegularEl.textContent = `${otherAmount.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${otherCurrency}`.trim();
                  }
                }
                if (otherCompareEl && otherDiscountEl) {
                  const compareCents = otherMatch.compare_at_price;
                  if (compareCents && compareCents > otherMatch.price) {
                    otherCompareEl.textContent = window.Shopify?.formatMoney
                      ? window.Shopify.formatMoney(compareCents)
                      : otherCompareEl.textContent;
                    otherCompareEl.classList.remove('hidden');
                    const otherDiscountValueEl = otherDiscountEl.querySelector('.product__upsell_discount__value');
                    (otherDiscountValueEl || otherDiscountEl).textContent = `-${Math.round(((compareCents - otherMatch.price) / compareCents) * 100)}%`;
                    otherDiscountEl.classList.remove('hidden');
                  } else {
                    otherCompareEl.classList.add('hidden');
                    otherDiscountEl.classList.add('hidden');
                  }
                }
              }
            });
          }

          btn.classList.add('active');

          if (groupContainer.querySelector('.option_value')) {
            const optionValueDiv = groupContainer.querySelector('.option_value');
            const displayLabel = (btn.dataset.label || '').trim();
            optionValueDiv.textContent = displayLabel || btn.dataset.value || '';
          }

          updateCheckbox();

          const variantRadios = document.querySelector('variant-radios');
          if (variantRadios && typeof variantRadios.updatePrices === 'function') {
            variantRadios.updatePrices();
          }
        });
      });

      updateCheckbox();
    });
  }

  const upsellVariantsIO = new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    initUpsellVariants();
  }, { threshold: 0.1 });

  upsellVariantsIO.observe(upsellContainer);
})();

// toggle class in upsell item
(function () {
    const inputs = document.querySelectorAll('.product__upsell input')
  
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        const upsellItem = input.closest('.product__upsell_item')
        if (input.checked) {
          upsellItem.classList.add('active')
        } else {
          upsellItem.classList.remove('active')
        }
      })
    })
  })();
  // toggle class in upsell item

(function () {
document.addEventListener('DOMContentLoaded', function () {
  const touchImages = document.querySelectorAll('.default_option img, .lip__item img');

  touchImages.forEach(img => {
    img.addEventListener('touchstart', () => {
      img.classList.add('tapped');

      setTimeout(() => {
        img.classList.remove('tapped');
      }, 1000);
    });
  });
});
})();
// product options hover on mobile
