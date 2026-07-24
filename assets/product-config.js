function initProductConfigCore() {
    if (window.__evamatsProductConfigInitialized) return;
    window.__evamatsProductConfigInitialized = true;

    const productContainer = document.querySelector('.product.config_container');
    const popupContainer = document.querySelector('.application_form__content.config_container');
    if (!productContainer && !popupContainer) return;

    // Получение значений по умолчанию
    let initialautoType
    let autoType
    if (document.querySelector('.product')) {
      initialautoType = document.querySelector('.product').dataset.type;  // Тип авто
      autoType = document.querySelector('.product').dataset.type;  // Тип авто
    } else {
      autoType = '5os'
    }
    
    const lipFields = document.querySelectorAll('.lip__field')

    const patternClassMap = {
      diamonds: 'diamonds',
      honey: 'honey',
      drop: 'drop'
    };

    function stripBrandFromOptionLabel(value) {
      if (typeof window.evamatsStripBrandLabel === 'function') {
        return window.evamatsStripBrandLabel(value);
      }
      return String(value || '')
        .replace(/\s*(?:EVAMATS|Carvion)\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // Базовый путь к изображениям
    function getFilesCdnBase() {
      const productEl = document.querySelector('.product.config_container') || document.querySelector('.product');
      const fromData = productEl?.dataset.filesCdn;
      if (fromData) {
        return fromData.endsWith('/') ? fromData : `${fromData}/`;
      }
      return 'https://cdn.shopify.com/s/files/1/0790/9218/7414/files/';
    }
    const basePath = getFilesCdnBase();
    const typeMapping = {
      '7os': '5os', 'pickup': '5os', 'pickup2kabina': '5os', '2os': '5os',
      'van_maly': '5os', 'electro': '5os', 'custom': '5os', 'electro_7os': '5os',
      'elektrický': '5os', 'elektricky': '5os', 'electric': '5os',
      'van_duzy': 'VAN', 'camper': 'VAN', 'tractor': 'VAN', 'bus_solid': 'VAN',
      'van_duzy_solid': 'VAN', 'van_duzy_solid_2_row': 'VAN',
      'van_duzy_separate': 'bus', 'van_duzy_separate_2_row': 'bus',
      'minivan_mini': 'minivan'
    };
    if (autoType) {
      autoType = typeMapping[autoType.toLowerCase()] || autoType;
    }

    function getEffectiveBodyTypeForImage() {
      const productEl = document.querySelector('.product');
      const raw = productEl ? (productEl.dataset.type || '').trim() : '';
      if (!raw) return null;
      if (raw.indexOf(',') >= 0) {
        const bodyScope = document.querySelector('[data-config-intro]') || document.querySelector('[data-dropdown="year"]');
        const radio = bodyScope && bodyScope.querySelector('.js-config-body-type:checked');
        if (radio) {
          let t = (radio.getAttribute('data-body-type') || radio.value || '').trim().toLowerCase();
          if (t.indexOf('7os') >= 0) return '7os';
          if (t.indexOf('5os') >= 0) return '5os';
        }
        return raw.split(',')[0].trim();
      }
      return raw;
    }
    // Функция для получения текущих значений опций
    function getCurrentOptions(container) {
      const matTypeElement = container.querySelector('.product-form__input[data-name="mats_type"] input:checked');
      const matType = matTypeElement ? matTypeElement.dataset.name.toLowerCase().replace(/\s+/g, '-') : '';
      const patternInput = container.querySelector('.lip__field[data-type="matPattern"] input:checked');
      let matPattern = patternInput ? patternInput.dataset.value : '';
      const matColorInput = container.querySelector('.lip__field[data-type="matColor"] input:checked');
      const matColor = matColorInput ? matColorInput.dataset.value : '';
      const trimInput = container.querySelector('.lip__field[data-type="trimColor"] input:checked');
      let edgeColor = trimInput ? trimInput.dataset.value : '';

      if (matPattern !== 'drop') {
        if (edgeColor === 'darkblue') edgeColor = 'blue';
        else if (edgeColor === 'blue') edgeColor = 'darkblue';
      }

      return { matType, matPattern, matColor, edgeColor };
    }

    function handlePatternChange(input, parentContainer) {
      const patternClass = patternClassMap[input.dataset.value];
      if (!patternClass) return;

      const matColorField = parentContainer.querySelector('.lip__field[data-type="matColor"]');
      if (!matColorField) return;

      ['honey_active', 'diamonds_active', 'drop_active'].forEach(function (cls) {
        matColorField.classList.remove(cls);
      });
      matColorField.classList.add(patternClass + '_active');

      let currentCheckedInput = matColorField.querySelector('input:checked');
      if (currentCheckedInput) {
        const currentItem = currentCheckedInput.closest('.lip__item');
        if (currentItem && !currentItem.classList.contains(patternClass)) {
          currentCheckedInput.checked = false;
        }
      }

      if (!matColorField.querySelector('input:checked')) {
        const firstVisibleInput = matColorField.querySelector('.lip__item.' + patternClass + ' input[type="radio"]');
        if (firstVisibleInput) {
          firstVisibleInput.checked = true;
          updateSelectedValueText(parentContainer);
        }
      }
    }

    function restoreMatPattern(container) {
      if (!container) return;
      setTimeout(function () {
        const checkedPattern = container.querySelector('.lip__field[data-type="matPattern"] input:checked');
        if (!checkedPattern) return;
        const patternClass = patternClassMap[checkedPattern.dataset.value];
        if (!patternClass) return;

        const matColorField = container.querySelector('.lip__field[data-type="matColor"]');
        if (!matColorField) return;

        ['honey_active', 'diamonds_active', 'drop_active'].forEach(function (cls) {
          matColorField.classList.remove(cls);
        });
        matColorField.classList.add(patternClass + '_active');

        const checkedColor = matColorField.querySelector('input[type="radio"]:checked');
        if (checkedColor) {
          const item = checkedColor.closest('.lip__item');
          if (item && !item.classList.contains(patternClass)) {
            checkedColor.checked = false;
          }
        }

        if (!matColorField.querySelector('input[type="radio"]:checked')) {
          const firstValid = matColorField.querySelector('.lip__item.' + patternClass + ' input[type="radio"]');
          if (firstValid) firstValid.checked = true;
        }

        updateSelectedValueText(container);
        updateMatImage(container);
        updateLipTitleValue();
      }, 50);
    }
  
    // Функция для обновления изображения коврика
    function updateMatImage(container) {
      let { matType, matPattern, matColor, edgeColor } = getCurrentOptions(container);
      if (!matPattern || !matColor || !edgeColor) return;
      let typeForImage = autoType;
      if (!container.classList.contains('application_form__content')) {
        const effective = getEffectiveBodyTypeForImage();
        typeForImage = effective ? (typeMapping[effective] || effective) : autoType;
      }
      if (typeForImage == 'tir' || typeForImage == 'bus') {
        matPattern = 'diamonds'
      }
      
      // Построение URL изображения
      let imageUrl = `${basePath}${typeForImage}-${matType ? matType + '-' : ''}${matPattern}-${matColor}-${edgeColor}.webp`;

      const selector = window.innerWidth > 1023
        ? '.product__config_image--desktop img'
        : '.product__config_image--mobile_image';

      container.querySelectorAll(selector).forEach((img) => {
        img.src = imageUrl;
      });
    }

    function getRadioOptionImage(input) {
      if (!input) return '';
      const label = input.closest('label') || document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      const img = label?.querySelector('img');
      return img?.getAttribute('src') || '';
    }

    function updatePreviewChip(container, displaySelector, input) {
      const chip = container.querySelector(`.evamats-config-preview__chip${displaySelector}`);
      if (!chip) return;

      chip.replaceChildren();
      if (!input) {
        chip.hidden = true;
        return;
      }

      const value = (input.dataset.title || input.value || '').trim();
      if (!value) {
        chip.hidden = true;
        return;
      }

      const thumbSrc = getRadioOptionImage(input);
      chip.hidden = false;

      if (thumbSrc) {
        const thumb = document.createElement('span');
        thumb.className = 'evamats-config-preview__chip-thumb';
        const img = document.createElement('img');
        img.src = thumbSrc;
        img.alt = '';
        img.width = 22;
        img.height = 22;
        img.loading = 'lazy';
        thumb.appendChild(img);
        chip.appendChild(thumb);
      }

      let displayValue = value;
      if (chip.dataset.name === 'mats_type') {
        displayValue = stripBrandFromOptionLabel(displayValue);
      }

      if (!displayValue && !thumbSrc) {
        chip.hidden = true;
        return;
      }

      const text = document.createElement('span');
      text.className = 'evamats-config-preview__chip-text';
      const chipLabel = chip.dataset.chipLabel;
      text.textContent = chipLabel ? `${chipLabel}: ${displayValue}` : displayValue;
      chip.appendChild(text);
    }

    function updatePreviewSwatch(container, displaySelector, input) {
      const swatch = container.querySelector(`.evamats-config-preview__swatch${displaySelector}`);
      if (!swatch) return;

      let thumbSrc = getRadioOptionImage(input);
      if (displaySelector === '[data-type="matPattern"]') {
        const matColorInput = container.querySelector('.lip__field[data-type="matColor"] input:checked');
        thumbSrc = getRadioOptionImage(matColorInput);
      }

      if (!input || !thumbSrc) {
        swatch.hidden = true;
        swatch.innerHTML = '';
        return;
      }

      swatch.hidden = false;
      swatch.innerHTML = `<img src="${thumbSrc}" alt="" width="46" height="46" loading="lazy">`;
    }

    function updateSelectedValueText(container) {
      if (window.innerWidth >= 990 || !container) return;
      if (!container.querySelector('.evamats-config-preview')) return;

      const fields = [
        { selector: '.product-form__input[data-name="mats_set"]', displaySelector: '[data-name="mats_set"]', swatch: false },
        { selector: '.product-form__input[data-name="mats_type"]', displaySelector: '[data-name="mats_type"]', swatch: false },
        { selector: '.lip__field[data-type="matPattern"]', displaySelector: '[data-type="matPattern"]', swatch: true },
        { selector: '.lip__field[data-type="matColor"]', displaySelector: '[data-type="matColor"]', swatch: false },
        { selector: '.lip__field[data-type="trimColor"]', displaySelector: '[data-type="trimColor"]', swatch: true }
      ];

      fields.forEach(({ selector, displaySelector, swatch }) => {
        const input = container.querySelector(`${selector} input:checked`);
        if (!input) {
          updatePreviewChip(container, displaySelector, null);
          if (swatch) updatePreviewSwatch(container, displaySelector, null);
          return;
        }

        updatePreviewChip(container, displaySelector, input);
        if (swatch) updatePreviewSwatch(container, displaySelector, input);
      });
    }

    const typeCustomPrices = {
      noEdge: [450,450,710,550,910],
      withEdge: [550,550,910,550,1210]
    }

    function updateMatsSetOptionPrices() {
      const matsSetField = document.querySelector('.evamats-config fieldset[data-name="mats_set"]');
      if (!matsSetField) return;

      const variantRadios = document.querySelector('variant-radios');
      const moneyReference =
        document.querySelector('.sticky_config_price_price') ||
        document.querySelector('.evamats-config-checkout__price-current');

      if (initialautoType === 'custom') {
        const selectedMatsType = document.querySelector('fieldset[data-name="mats_type"] input:checked');
        const matsTypeIndex = selectedMatsType
          ? Array.from(selectedMatsType.closest('fieldset').querySelectorAll('input')).indexOf(selectedMatsType)
          : -1;
        const priceList = matsTypeIndex === 2 ? typeCustomPrices.withEdge : typeCustomPrices.noEdge;

        matsSetField.querySelectorAll('input[type="radio"]').forEach((input, index) => {
          const label = document.querySelector(`label[for="${input.id}"]`);
          const priceEl = label?.querySelector('.label__tooltip');
          const price = priceList[index];
          if (priceEl && price != null) {
            priceEl.textContent = `${price} €`;
          }
        });
        return;
      }

      if (!variantRadios) return;

      let variants;
      try {
        variants = JSON.parse(variantRadios.querySelector('script[type="application/json"]').textContent);
      } catch (e) {
        return;
      }

      const optionNames = [];
      variantRadios.querySelectorAll('fieldset.js.product-form__input').forEach((fieldset) => {
        const input = fieldset.querySelector('input[type="radio"]');
        if (input && input.name && !optionNames.includes(input.name)) {
          optionNames.push(input.name);
        }
      });

      const selectedByName = {};
      optionNames.forEach((name) => {
        const checked = variantRadios.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
        if (checked) selectedByName[name] = checked.value;
      });

      function findVariant(valuesByName) {
        return variants.find((variant) => {
          return optionNames.every((name, idx) => {
            const val = valuesByName[name];
            if (val == null || val === '') return true;
            return variant[`option${idx + 1}`] === val;
          });
        });
      }

      matsSetField.querySelectorAll('input[type="radio"]').forEach((input) => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const priceEl = label?.querySelector('.label__tooltip');
        if (!priceEl) return;

        const valuesByName = { ...selectedByName, [input.name]: input.value };
        const variant = findVariant(valuesByName);
        if (!variant) return;

        if (typeof variantRadios.formatMoneyLikeDisplay === 'function' && moneyReference) {
          priceEl.textContent = variantRadios.formatMoneyLikeDisplay(variant.price, moneyReference.innerHTML);
        } else {
          priceEl.textContent = (variant.price / 100).toFixed(2);
        }
      });
    }
    
    const isGiftCardAmountField = (field) =>
      field &&
      (field.id === 'gift-card-amount' || field.classList.contains('evamats-product-option--amount'));

    const updateLipTitleValue = () => {
    
      lipFields.forEach(field => {
        if (isGiftCardAmountField(field)) return;

        const inputChecked = field.querySelector('input:checked')
        if (inputChecked) {
          const value = field.querySelector('input:checked').dataset.title;
    
  
          const selectedMatsType = document.querySelector('fieldset[data-name="mats_type"] input:checked');
          const selectedmatsSet = document.querySelector('fieldset[data-name="mats_set"] input:checked');
          const selectedSize = document.querySelector('input[data-name="mats_size"]:checked');
  
          const matsTypeProperty = document.querySelector('[name="properties[MatsType dywaników_]"]')
          const matsSetProperty = document.querySelector('[name="properties[matsSet_]"]')
          const sizeProperty = document.querySelector('[name="properties[Size_]"]')
          
          if (matsTypeProperty) {
            matsTypeProperty.value = selectedMatsType.value
            matsSetProperty.value = selectedmatsSet.value          
          }
          if (sizeProperty) {
            sizeProperty.value = selectedSize.value        
          }
          if (field.querySelector('.lip__title_value')) {
            field.querySelector('.lip__title_value').textContent = stripBrandFromOptionLabel(value);
          }
        }
      });
    };
  
    function handleConfigRadioChange(input) {
      const parentContainer = input.closest('.config_container');
      if (!parentContainer) return;
      if (input.closest('.lip__field[data-type="matPattern"]')) {
        handlePatternChange(input, parentContainer);
      }
      updateMatImage(parentContainer);
      updateLipTitleValue();
      updateMatsSetOptionPrices();
      updateSelectedValueText(parentContainer);
    }

    document.addEventListener('change', function (e) {
      const input = e.target;
      if (!input.matches('input[type="radio"]')) return;

      if (input.matches('.js-config-body-type') && input.closest('[data-config-intro], [data-dropdown="year"]')) {
        filterZestawByBodyType();
        if (productContainer) updateMatImage(productContainer);
        if (popupContainer) updateMatImage(popupContainer);
        return;
      }

      if (!input.closest('.config_container .product-form__input, .config_container .lip__field')) return;
      handleConfigRadioChange(input);
    }, true);
  
    // Инициализация изображения при загрузке страницы
    if (productContainer) {
      updateMatImage(productContainer);
      restoreMatPattern(productContainer);
      updateSelectedValueText(productContainer);
    }
    if (popupContainer) {
      updateMatImage(popupContainer);
      restoreMatPattern(popupContainer);
      updateSelectedValueText(popupContainer);
    }
    updateLipTitleValue();
    updateMatsSetOptionPrices();

    document.addEventListener('evamats:discount-updated', updateMatsSetOptionPrices);

    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      if (productContainer) restoreMatPattern(productContainer);
      if (popupContainer) restoreMatPattern(popupContainer);
    });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductConfigCore);
} else {
  initProductConfigCore();
}

function filterZestawByBodyType() {
  const bodyScope = document.querySelector('[data-config-intro]') || document.querySelector('[data-dropdown="year"]');
  const bodyTypeRadio = bodyScope && bodyScope.querySelector('.js-config-body-type:checked');
  const matsSetWr = document.querySelector('[data-dropdown="mats_set_type"]');
  const container = (matsSetWr && matsSetWr.closest('.config_container')) || document;
  const matsSet = container.querySelector('.product-form__input[data-name="mats_set"]');
  if (!matsSet) return;

  const inputs = matsSet.querySelectorAll('input[type="radio"]');
  if (!inputs.length) return;

  function norm(s) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  let selectedType = '';
  if (bodyTypeRadio) {
    selectedType = (bodyTypeRadio.getAttribute('data-body-type') || bodyTypeRadio.value || '').trim().toLowerCase();
    if (selectedType.includes('7os')) selectedType = '7os';
    else if (selectedType.includes('5os')) selectedType = '5os';
    else selectedType = '';
  }

  inputs.forEach(function (input) {
    const types = (input.getAttribute('data-body-types') || '').trim();
    const label = container.querySelector('label[for="' + input.id + '"]');
    if (!selectedType) {
      input.style.display = '';
      if (label) label.style.display = '';
      return;
    }
    const allowed = types.split(/\s+/).filter(Boolean).map(norm);
    const show = allowed.length === 0 || allowed.some(function (t) { return t === selectedType; });
    input.style.display = show ? '' : 'none';
    if (label) label.style.display = show ? '' : 'none';
  });

  const checked = matsSet.querySelector('input[type="radio"]:checked');
  if (checked && checked.style.display === 'none') {
    const firstVisible = matsSet.querySelector('input[type="radio"]:not([style*="display: none"])');
    if (firstVisible) {
      firstVisible.checked = true;
      matsSet.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (selectedType) {
    inputs.forEach(function (input) {
      if (input.style.display === 'none') return;
      const label = container.querySelector('label[for="' + input.id + '"]');
      if (!label) return;
      const img = label.querySelector('img[data-image-5os], img[data-image-7os]');
      if (!img) return;
      const src = img.getAttribute('data-image-' + selectedType);
      if (src) img.src = src;
    });
  }
}

// Fixed config image (mobile) — same behavior as main theme
const configImagePreview = (() => {
  let state = null;

  function syncPreviewEnlargeLabel(preview) {
    if (!preview) return;
    const btn = preview.querySelector('[data-preview-enlarge]');
    if (!btn) return;
    const label = btn.querySelector('[data-preview-enlarge-label]');
    const enlarged = preview.classList.contains('is-enlarged');
    const text = enlarged
      ? btn.getAttribute('data-label-shrink')
      : btn.getAttribute('data-label-enlarge');
    if (label && text) label.textContent = text;
    btn.setAttribute('aria-expanded', enlarged ? 'true' : 'false');
  }

  function syncPreviewHideLabel(preview) {
    if (!preview) return;
    const btn = preview.querySelector('[data-preview-mat-toggle]');
    if (!btn) return;
    const matHidden = preview.classList.contains('is-mat-hidden');
    const hideLabel = btn.getAttribute('data-label-hide');
    const showLabel = btn.getAttribute('data-label-show');
    btn.setAttribute('aria-label', matHidden && showLabel ? showLabel : hideLabel || '');
    btn.setAttribute('aria-pressed', matHidden ? 'true' : 'false');
  }

  function openPreviewZoom(preview) {
    const img = preview.querySelector('.evamats-config-preview__image, .product__config_image--mobile_image');
    const src = img && (img.currentSrc || img.src);
    if (!src || src.includes('1x1')) return;

    if (typeof Fancybox !== 'undefined' && typeof Fancybox.show === 'function') {
      Fancybox.show([{ src: src, type: 'image' }]);
      return;
    }

    window.open(src, '_blank', 'noopener');
  }

  function resolveConfigPreviewImage() {
    const appPreview = document.querySelector(
      '#popupOverlayApplicationForm .product__config_image--main.product__config_image--mobile'
    );
    const productPreview =
      document.querySelector('.evamats-config .product__config_image--main.product__config_image--mobile') ||
      document.querySelector('.product.config_container .product__config_image--main.product__config_image--mobile');

    const isIndividualOrderPage = document.body.classList.contains('template_zamowienie-indywidualne');
    if (isIndividualOrderPage && appPreview) return appPreview;
    if (productPreview) return productPreview;
    if (appPreview) return appPreview;
    return document.querySelector('.product__config_image--main.product__config_image--mobile');
  }

  function refresh() {
    if (!state) {
      const configImage = resolveConfigPreviewImage();
      if (!configImage) return;

      const scope = configImage.closest('.config_container') || document;
      const matsSetStep = scope.querySelector('[data-dropdown="mats_set_type"]');
      const colorsStep = scope.querySelector('[data-dropdown="mat_patterns_colors"]');
      if (!matsSetStep && !colorsStep) return;

      const firstStep = scope.querySelector('.product__dropdown_wr');
      state = {
        configImage,
        scope,
        matsSetStep,
        colorsStep,
        isFirst: Boolean(colorsStep && colorsStep === firstStep)
      };

      window.addEventListener('resize', refresh, { passive: true });

      document.addEventListener('click', (e) => {
        if (e.target.closest('.product__dropdown_button')) {
          setTimeout(refresh, 0);
          setTimeout(refresh, 500);
        }
        if (e.target.closest('[data-preview-mat-toggle]')) {
          e.preventDefault();
          e.stopPropagation();
          const preview = e.target.closest('.evamats-config-preview') || state.configImage;
          if (!preview) return;
          preview.classList.toggle('is-mat-hidden');
          if (preview.classList.contains('is-mat-hidden')) {
            preview.classList.remove('is-enlarged');
            syncPreviewEnlargeLabel(preview);
          }
          syncPreviewHideLabel(preview);
          return;
        }

        if (e.target.closest('[data-preview-close]')) {
          e.preventDefault();
          e.stopPropagation();
          const preview = e.target.closest('.evamats-config-preview') || state.configImage;
          if (!preview) return;
          preview.classList.add('fixed_hidden', 'is-user-collapsed');
          preview.classList.remove('is-enlarged', 'is-mat-hidden');
          syncPreviewEnlargeLabel(preview);
          syncPreviewHideLabel(preview);
          return;
        }

        if (e.target.closest('[data-preview-reopen]')) {
          e.preventDefault();
          e.stopPropagation();
          const preview = e.target.closest('.evamats-config-preview') || state.configImage;
          if (!preview) return;
          preview.classList.remove('fixed_hidden', 'is-user-collapsed');
          syncPreviewHideLabel(preview);
          return;
        }

        const enlargeBtn = e.target.closest('[data-preview-enlarge]');
        if (enlargeBtn && state.configImage.contains(enlargeBtn)) {
          state.configImage.classList.toggle('is-enlarged');
          syncPreviewEnlargeLabel(state.configImage);
          return;
        }

        const zoomBtn = e.target.closest('[data-preview-zoom]');
        if (zoomBtn && state.configImage.contains(zoomBtn)) {
          openPreviewZoom(state.configImage);
        }
      }, true);

      document.addEventListener('evamats:config-step-updated', refresh);

      scope.querySelectorAll('.product__dropdown_wr[data-dropdown]').forEach((element) => {
        new MutationObserver(refresh).observe(element, {
          attributes: true,
          attributeFilter: ['class']
        });
      });

      if (state.isFirst) {
        let counter = 0;
        window.addEventListener('scroll', () => {
          if (counter > 0 || !state) return;
          const anchor = state.matsSetStep || state.colorsStep;
          const distance = anchor && anchor.getBoundingClientRect().top;
          if (distance != null && distance <= 200) {
            state.isFirst = false;
            refresh();
            counter++;
          }
        }, { passive: true });
      }
    }

    if (!state) return;

    const { configImage, colorsStep } = state;
    if (window.innerWidth >= 990) {
      configImage.classList.remove('is-fixed', 'fixed_hidden');
      return;
    }

    configImage.classList.add('is-fixed');
    const colorsOpen = Boolean(colorsStep && colorsStep.classList.contains('open') && !state.isFirst);
    if (!colorsOpen) {
      configImage.classList.add('fixed_hidden');
      configImage.classList.remove('is-user-collapsed', 'is-mat-hidden', 'is-enlarged');
      syncPreviewEnlargeLabel(configImage);
    } else if (!configImage.classList.contains('is-user-collapsed')) {
      configImage.classList.remove('fixed_hidden');
    }
    syncPreviewHideLabel(configImage);
  }

  return { refresh };
})();

window.__evamatsRefreshConfigImagePreview = configImagePreview.refresh;

function initConfigImage() {
  configImagePreview.refresh();
}

function scheduleConfigImageInit() {
  const isIndividualOrderPage = document.body.classList.contains('template_zamowienie-indywidualne');
  const productTarget =
    document.querySelector('.evamats-config .product__config_image--main') ||
    document.querySelector('.product.config_container .product__config_image--main');
  const appTarget = document.querySelector('#popupOverlayApplicationForm .product__config_image--main');

  if (isIndividualOrderPage && appTarget) {
    initConfigImage();
    return;
  }

  if (window.innerWidth >= 990) return;

  const target = productTarget || appTarget;
  if (!target) return;

  if (productTarget) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        initConfigImage();
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    observer.observe(productTarget);
    return;
  }

  initConfigImage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleConfigImageInit);
} else {
  scheduleConfigImageInit();
}

window.addEventListener('resize', () => {
  if (window.innerWidth < 990) {
    initConfigImage();
  } else if (typeof window.__evamatsRefreshConfigImagePreview === 'function') {
    window.__evamatsRefreshConfigImagePreview();
  }
}, { passive: true });

// config steps
(function () {
  if (!document.querySelector('.config_container, .application_form__content.config_container')) return;

  const formContainers = document.querySelectorAll('.config_container');

  if (formContainers.length > 0) {

    formContainers.forEach(container => {
      if (!container.querySelector('.product__dropdown_wr') && !container.querySelector('[data-config-intro]')) return;
  
      container.querySelectorAll('fieldset .error-message').forEach(el => {
        el.style.display = 'none';
      });
  
      const faqTitles = container.querySelectorAll(
        '.product__dropdown_wr > .product__dropdown_title, .product__dropdown_wr > [class*="product__dropdown_title--"]'
      );
      const faqWrappers = container.querySelectorAll('.product__dropdown_wr');
  
      function triggerFaq(element) {
        const wrapper = element.closest('.product__dropdown_wr');
        const inner = wrapper.querySelector('.product__dropdown_inner');
  
        faqWrappers.forEach(w => {
          if (w !== wrapper) {
            w.classList.remove('open');
            const innerOther = w.querySelector('.product__dropdown_inner');
            innerOther.classList.remove('open');
            if (innerOther.classList.contains('super_done')) {
              innerOther.classList.add('done');
            } else {
              innerOther.style.maxHeight = null;
            }
          }
        });
  
        if (wrapper.classList.contains("open")) {
          wrapper.classList.remove("open");
          inner.classList.remove("open");
          if (inner.classList.contains("super_done")) {
            inner.classList.add("done");
          } else {
            inner.style.maxHeight = null;
          }
        } else {
          wrapper.classList.add("open");
          inner.classList.add("open");
          inner.classList.remove("done");
          updateContinueButton(wrapper);
        }
        if (typeof updateConfigStepStatuses === 'function') updateConfigStepStatuses();
        window.__evamatsRefreshConfigImagePreview?.();
      }
  
      faqTitles.forEach(title => {
        title.addEventListener('click', function (e) {
          if (e.target.closest('.openPopup')) return;
          triggerFaq(this);
        });
      });

      function getFieldErrorContainer(element) {
        if (!element) return null;
        return element.closest('fieldset') || element.closest('.line-item-property__field');
      }

      function fieldsetIsValid(fieldset) {
        if (!fieldset) return true;
        const requiredElements = fieldset.querySelectorAll('input[required], select[required], textarea[required]');
        const processedRadioGroups = new Set();
        for (let i = 0; i < requiredElements.length; i++) {
          const element = requiredElements[i];
          if (!element.offsetParent) continue;
          if (element.type === 'radio') {
            if (processedRadioGroups.has(element.name)) continue;
            processedRadioGroups.add(element.name);
            const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]')).filter(
              (r) => r.name === element.name
            );
            let groupValid = false;
            radios.forEach((radio) => {
              if (radio.checked) groupValid = true;
            });
            if (!groupValid) return false;
          } else if (element.type === 'checkbox') {
            if (!element.checked) return false;
          } else {
            if (String(element.value || '').trim() === '') return false;
          }
        }
        return true;
      }

      function hideFieldsetErrorIfValid(container) {
        if (!container) return;
        if (fieldsetIsValid(container)) {
          const errorMessage = container.querySelector('.error-message');
          if (errorMessage) errorMessage.style.display = 'none';
        }
      }
  
      function validateStep(wrapper, showErrors = false) {
        let stepValid = true;
        const processedRadioGroups = new Set();
        const requiredElements = wrapper.querySelectorAll('input[required], select[required], textarea[required]');
  
        requiredElements.forEach(element => {
          if (!element.offsetParent) return;
          let valid = true;
          if (element.type === 'radio') {
            if (processedRadioGroups.has(element.name)) return;
            processedRadioGroups.add(element.name);
            const radios = wrapper.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
            let groupValid = false;
            radios.forEach(radio => {
              if (radio.checked) groupValid = true;
            });
            valid = groupValid;
          } else if (element.type === 'checkbox') {
            valid = element.checked;
          } else {
            valid = element.value.trim() !== '';
          }
          const errorContainer = getFieldErrorContainer(element);
          if (!valid) {
            stepValid = false;
            if (showErrors && errorContainer) {
              const errorMessage = errorContainer.querySelector('.error-message');
              if (errorMessage) {
                errorMessage.style.display = 'block';
              }
            }
          } else {
            if (showErrors && errorContainer) {
              const errorMessage = errorContainer.querySelector('.error-message');
              if (errorMessage) {
                errorMessage.style.display = 'none';
              }
            }
          }
        });
        return stepValid;
      }
      function updateContinueButton(wrapper) {
        const continueBtn = wrapper.querySelector('.product__dropdown_button');
        if (!continueBtn) return;

        const isValid = validateStep(wrapper, false);
        continueBtn.removeAttribute('disabled');
        continueBtn.classList.toggle('disabled-button', !isValid);
        continueBtn.setAttribute('aria-disabled', String(!isValid));
        document.dispatchEvent(new CustomEvent('evamats:config-step-updated'));
      }
  
      function goToNextStep() {
        const currentStep = document.querySelector('.product__dropdown_wr.active');
        if (!currentStep) return;
  
        const continueBtn = currentStep.querySelector('.product__dropdown_button');
        if (continueBtn && (continueBtn.disabled || continueBtn.getAttribute('aria-disabled') === 'true')) return;
  
        currentStep.classList.remove('active');
        const nextStep = currentStep.nextElementSibling;
        if (nextStep) {
          nextStep.classList.add('active');
          updateContinueButton(nextStep);
        }
      }
  
      function getAllMainDropdowns(scope) {
        return Array.from(scope.querySelectorAll('.product__dropdown_wr')).filter(function (wrapper) {
          return !wrapper.classList.contains('product__dropdown_wr--extras');
        });
      }

      function getNextDropdown(current) {
        const scope = current.closest('.config_container') || container;

        if (isIntroStep(current)) {
          const firstDropdown = getAllMainDropdowns(scope)[0];
          if (firstDropdown) {
            firstDropdown.classList.remove('disabled');
            return firstDropdown;
          }
          return null;
        }

        const dropdowns = getAllMainDropdowns(scope);
        const currentIndex = dropdowns.indexOf(current);
        if (currentIndex >= 0 && currentIndex < dropdowns.length - 1) {
          const next = dropdowns[currentIndex + 1];
          next.classList.remove('disabled');
          return next;
        }

        return null;
      }

      function getStepWrapper(element) {
        return element.closest('.product__dropdown_wr') || element.closest('[data-config-intro]');
      }

      function isIntroStep(wrapper) {
        return wrapper && wrapper.matches('[data-config-intro]');
      }

      function getNextStepWrapper(current) {
        if (isIntroStep(current)) {
          return getNextDropdown(current);
        }
        return getNextDropdown(current);
      }

      function openNextStepWrapper(nextWrapper, wrapper) {
        if (!nextWrapper) return;

        nextWrapper.classList.add('open');
        nextWrapper.classList.remove('disabled');
        const nextInner = nextWrapper.querySelector('.product__dropdown_inner');
        if (nextInner) {
          nextInner.classList.remove('done');
          nextInner.classList.add('open');
        }

        if (nextWrapper.getAttribute('data-dropdown') === 'mats_set_type') {
          filterZestawByBodyType();
        }

        updateContinueButton(nextWrapper);

        if (nextWrapper.classList.contains('product__dropdown_wr--heel')) {
          const extrasWr = nextWrapper.nextElementSibling;
          if (extrasWr && extrasWr.classList.contains('product__dropdown_wr--extras')) {
            extrasWr.classList.remove('disabled');
          }
        }

        const nextTitle = nextWrapper.querySelector('.product__dropdown_title');
        const popup = document.querySelector('#popupOverlayApplicationForm');
        const isInsidePopup = wrapper.closest('.popup');

        setTimeout(() => {
          if (nextTitle) {
            if (isInsidePopup) {
              popup.scrollTo({
                top: nextTitle.offsetTop - 20,
                behavior: 'smooth'
              });
            } else {
              window.scrollTo({
                top: nextTitle.getBoundingClientRect().top + window.scrollY - 350,
                behavior: 'smooth'
              });
            }
          }
        }, 500);

        window.__evamatsRefreshConfigImagePreview?.();
        setTimeout(window.__evamatsRefreshConfigImagePreview, 550);
      }

      function stripBrandLabelLocal(value) {
        if (typeof window.evamatsStripBrandLabel === 'function') {
          return window.evamatsStripBrandLabel(value);
        }
        return String(value || '')
          .replace(/\s*(?:EVAMATS|Carvion)\s*/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }

      function getConfigStepLabels() {
        return {
          notSelected: container.dataset.stepNotSelected || '',
          tapToSelect: container.dataset.stepTapToSelect || ''
        };
      }

      function ensureConfigStepTitle(title, index) {
        if (!title) return null;

        let numEl = title.querySelector('.product__dropdown_step-num');
        if (!numEl) {
          numEl = document.createElement('span');
          numEl.className = 'product__dropdown_step-num';
          numEl.setAttribute('aria-hidden', 'true');
        }
        numEl.textContent = `${index + 1}.`;

        const isComplex =
          title.classList.contains('product__dropdown_title--heel') ||
          title.classList.contains('product__dropdown_title--extras');

        if (!title.dataset.stepEnhanced) {
          title.dataset.stepEnhanced = '1';

          if (isComplex) {
            const textEl = title.querySelector('.product__dropdown_title_text');
            if (textEl && !textEl.parentElement?.classList.contains('product__dropdown_title_row')) {
              const row = document.createElement('span');
              row.className = 'product__dropdown_title_row';
              textEl.parentNode.insertBefore(row, textEl);
              row.appendChild(numEl);
              row.appendChild(textEl);
            } else if (textEl) {
              textEl.parentNode.insertBefore(numEl, textEl);
            }

            let statusEl = title.querySelector('.product__dropdown_value');
            if (!statusEl) {
              statusEl = document.createElement('span');
              statusEl.className = 'product__dropdown_value';
              const heading = title.querySelector('.product__dropdown_title_heading');
              if (heading) heading.appendChild(statusEl);
              else title.insertBefore(statusEl, title.querySelector('.product__dropdown_title_actions'));
            }
            statusEl.setAttribute('data-step-status', '');

            let actions = title.querySelector('.product__dropdown_title_actions');
            if (!actions) {
              actions = document.createElement('span');
              actions.className = 'product__dropdown_title_actions';
              title.appendChild(actions);
            }
            const caret = title.querySelector('.icon-config-caret');
            if (caret && !caret.closest('.product__dropdown_caret')) {
              const wrap = document.createElement('span');
              wrap.className = 'product__dropdown_caret';
              wrap.setAttribute('aria-hidden', 'true');
              caret.parentNode.insertBefore(wrap, caret);
              wrap.appendChild(caret);
            }
          } else {
            const caret = title.querySelector('.icon-config-caret');
            const edit = title.querySelector('.icon-edit');
            let statusEl = title.querySelector('.product__dropdown_value');
            const clone = title.cloneNode(true);
            clone.querySelectorAll('svg, .icon-edit, .product__dropdown_value, .product__dropdown_step-num, .product__dropdown_caret').forEach((el) => el.remove());
            const labelText = clone.textContent.replace(/:\s*$/, '').replace(/\s+/g, ' ').trim();

            const main = document.createElement('span');
            main.className = 'product__dropdown_title_main';
            const row = document.createElement('span');
            row.className = 'product__dropdown_title_row';
            const textEl = document.createElement('span');
            textEl.className = 'product__dropdown_title_text';
            textEl.textContent = labelText ? `${labelText}:` : '';
            row.appendChild(numEl);
            row.appendChild(textEl);

            if (!statusEl) {
              statusEl = document.createElement('span');
              statusEl.className = 'product__dropdown_value';
            }
            statusEl.setAttribute('data-step-status', '');
            main.appendChild(row);
            main.appendChild(statusEl);

            const actions = document.createElement('span');
            actions.className = 'product__dropdown_title_actions';
            const caretWrap = document.createElement('span');
            caretWrap.className = 'product__dropdown_caret';
            caretWrap.setAttribute('aria-hidden', 'true');
            if (caret) caretWrap.appendChild(caret);
            actions.appendChild(caretWrap);
            if (edit) actions.appendChild(edit);

            title.replaceChildren(main, actions);
          }
        } else if (!numEl.isConnected) {
          const row = title.querySelector('.product__dropdown_title_row');
          const textEl = title.querySelector('.product__dropdown_title_text');
          if (row) row.insertBefore(numEl, row.firstChild);
          else if (textEl) textEl.parentNode.insertBefore(numEl, textEl);
        } else {
          numEl.textContent = `${index + 1}.`;
        }

        return title.querySelector('[data-step-status], .product__dropdown_value');
      }

      function collectStepSummary(wrapper) {
        const parts = [];
        const seen = new Set();

        const pushPart = (raw) => {
          const text = stripBrandLabelLocal(String(raw || '').replace(/#MWS.*$/, '').trim());
          if (!text || seen.has(text)) return;
          seen.add(text);
          parts.push(text);
        };

        wrapper.querySelectorAll('.lip__title_value').forEach((el) => pushPart(el.textContent));

        wrapper.querySelectorAll('.lip__field input:checked, fieldset input[type="radio"]:checked').forEach((input) => {
          const title = input.getAttribute('data-title') || input.value;
          const label = input.closest('label') || (input.id ? document.querySelector(`label[for="${input.id}"]`) : null);
          const labelText = label?.querySelector('.evamats-config-option-label, .evamats-product-option__label')?.textContent;
          pushPart(labelText || title);
        });

        const activeUpsell = wrapper.querySelector('.product__upsell_item.active .product__upsell_item_title');
        if (activeUpsell) pushPart(activeUpsell.textContent);

        const extrasChecked = wrapper.querySelectorAll('input[name="product__extras"]:checked');
        extrasChecked.forEach((input) => pushPart(input.getAttribute('data-title') || input.value));

        return parts.join(', ');
      }

      function updateConfigStepStatuses() {
        if (!container.classList.contains('evamats-config')) return;
        const labels = getConfigStepLabels();

        Array.from(faqWrappers).forEach((wrapper, index) => {
          const title = wrapper.querySelector(':scope > .product__dropdown_title, :scope > [class*="product__dropdown_title--"]');
          const statusEl = ensureConfigStepTitle(title, index);
          if (!statusEl) return;

          const isOptional =
            wrapper.classList.contains('product__dropdown_wr--heel') ||
            wrapper.classList.contains('product__dropdown_wr--extras');
          const inner = wrapper.querySelector('.product__dropdown_inner');
          const isComplete =
            wrapper.classList.contains('complete') ||
            (inner && inner.classList.contains('super_done') && !isOptional) ||
            (isOptional && Boolean(collectStepSummary(wrapper)));
          const summary = isOptional ? '' : collectStepSummary(wrapper);
          const isDisabled = wrapper.classList.contains('disabled');

          const canShowSummary =
            Boolean(summary) &&
            (!isDisabled || isComplete || wrapper.classList.contains('open'));

          statusEl.classList.toggle('is-filled', canShowSummary);

          if (isOptional) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-filled');
          } else if (canShowSummary) {
            statusEl.textContent = summary;
          } else if (isDisabled) {
            statusEl.textContent = labels.notSelected;
            statusEl.classList.remove('is-filled');
          } else {
            statusEl.textContent = labels.tapToSelect || labels.notSelected;
            statusEl.classList.remove('is-filled');
          }

          const isCurrent =
            !isDisabled &&
            wrapper.classList.contains('open') &&
            !isOptional &&
            !wrapper.classList.contains('complete') &&
            !(inner && inner.classList.contains('super_done'));
          wrapper.classList.toggle('is-current-step', isCurrent);
          wrapper.classList.toggle('is-incomplete', !isOptional && !isComplete && !isDisabled);
        });
      }

      function openFirstConfigStepDemo() {
        if (!container.classList.contains('evamats-config')) return;
        const first = Array.from(faqWrappers).find((wrapper) => {
          if (wrapper.classList.contains('product__dropdown_wr--heel')) return false;
          if (wrapper.classList.contains('product__dropdown_wr--extras')) return false;
          return Boolean(wrapper.querySelector('.product__dropdown_button'));
        });
        if (!first || first.classList.contains('open')) return;
        first.classList.add('open');
        const inner = first.querySelector('.product__dropdown_inner');
        if (inner) {
          inner.classList.add('open');
          inner.classList.remove('done');
        }
      }

      const configIntro = container.querySelector('[data-config-intro]');
      const stepWrappers = Array.from(faqWrappers).filter(wrapper => !wrapper.classList.contains('product__dropdown_wr--heel') && !wrapper.classList.contains('product__dropdown_wr--extras'));
      const hasConfigIntro = container.querySelector('[data-config-intro]');
      stepWrappers.forEach((wrapper, i) => {
        const title = wrapper.querySelector('.product__dropdown_title');
        if (title && !container.classList.contains('evamats-config')) {
          title.innerHTML = `${i + 1}. ${title.innerHTML}`;
        }
        if (i === 0 && !hasConfigIntro) {
          wrapper.classList.add('open');
          wrapper.querySelector('.product__dropdown_inner').classList.add('open');
          wrapper.classList.remove('disabled');
        }
      });

      if (container.classList.contains('evamats-config')) {
        updateConfigStepStatuses();
        container.addEventListener('change', updateConfigStepStatuses, true);
        container.addEventListener('input', updateConfigStepStatuses, true);
        document.addEventListener('evamats:config-step-updated', updateConfigStepStatuses);
      }

      if (configIntro) {
        updateContinueButton(configIntro);
      }

      document.querySelectorAll('.product__dropdown_wr').forEach(wrapper => {
        updateContinueButton(wrapper);
      });

      faqWrappers.forEach(wrapper => {
        updateContinueButton(wrapper);
      });

      if (container.querySelector('.application_form__next_button')) {
        updateNextButtonState(container);
      }

      document.querySelectorAll('.product__dropdown_inner input, .product__dropdown_inner select, .product__dropdown_inner textarea, [data-config-intro] input, [data-config-intro] select, [data-config-intro] textarea').forEach(element => {
        function onFieldInteraction() {
          const wrapper = getStepWrapper(this);
          if (wrapper) updateContinueButton(wrapper);
          hideFieldsetErrorIfValid(getFieldErrorContainer(this));
        }
        element.addEventListener('input', onFieldInteraction);
        element.addEventListener('change', onFieldInteraction);
      });
      let isRestoringConfig = false;

      function revalidate(e) {
        const wrapper = getStepWrapper(e.target);
        if (!wrapper) return;

        if (isRestoringConfig) {
          updateContinueButton(wrapper);
          hideFieldsetErrorIfValid(getFieldErrorContainer(e.target));
          return;
        }

        const inner = wrapper.querySelector('.product__dropdown_inner');

        const isValid = validateStep(wrapper, false);

        if (!isValid && inner) {
          inner.classList.remove('super_done');
          setFollowingStepsDisabled(wrapper, true);
        }

        if (!isValid && isIntroStep(wrapper)) {
          wrapper.classList.remove('complete');
        }

        updateContinueButton(wrapper);
        hideFieldsetErrorIfValid(getFieldErrorContainer(e.target));
        if (container.querySelector('.application_form__next_button')) {
          updateNextButtonState(container);
        }
      }

      if (configIntro) {
        const introRequiredEls = configIntro.querySelectorAll('input[required], select[required], textarea[required]');
        introRequiredEls.forEach(el => {
          el.addEventListener('input', revalidate);
          el.addEventListener('change', revalidate);
        });
      }

      faqWrappers.forEach(wrapper => {
        const requiredEls = wrapper.querySelectorAll('input[required], select[required], textarea[required]');
        const continueBtn = wrapper.querySelector('.product__dropdown_button');
        if (!continueBtn) return;
        updateContinueButton(wrapper);
        requiredEls.forEach(el => {
          el.addEventListener('input', revalidate);
          el.addEventListener('change', revalidate);
        });
      });
  
      const dropdownsButton = container.querySelectorAll('.product__dropdown_button');
  
      dropdownsButton.forEach(button => {
        button.addEventListener('click', function () {
          const wrapper = getStepWrapper(button);
          if (!wrapper) return;

          const inner = wrapper.querySelector('.product__dropdown_inner');

          if (!validateStep(wrapper, true)) {
            updateContinueButton(wrapper);
            return;
          }

          wrapper.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
          });

          if (isIntroStep(wrapper)) {
            wrapper.classList.add('complete');
          } else {
            wrapper.classList.remove('open');
            wrapper.classList.add('complete');
            inner.classList.remove('open');
            inner.classList.add('done', 'super_done');
          }

          const nextWrapper = getNextStepWrapper(wrapper);
          openNextStepWrapper(nextWrapper, wrapper);

          if (container.querySelector('.application_form__next_button')) {
            updateNextButtonState(container);
          }
          goToNextStep();
          document.dispatchEvent(new CustomEvent('evamats:config-step-updated'));
          if (typeof saveConfigState === 'function') saveConfigState();
        });
      });

      const CONFIG_STORAGE_KEY = 'evamats_product_config';
      let saveConfigTimer;

      function getConfigProductIdentity() {
        return {
          handle: container.dataset.productHandle || '',
          id: container.dataset.productId || ''
        };
      }

      function getStepKey(wrapper) {
        if (!wrapper) return '';
        if (wrapper.matches('[data-config-intro]')) return 'intro';
        if (wrapper.classList.contains('product__dropdown_wr--heel')) return 'heel';
        if (wrapper.classList.contains('product__dropdown_wr--extras')) return 'extras';
        const dropdown = wrapper.getAttribute('data-dropdown');
        if (dropdown) return dropdown;
        const steps = Array.from(container.querySelectorAll('.product__dropdown_wr'));
        return `step-${steps.indexOf(wrapper)}`;
      }

      function isOptionalConfigStep(wrapper) {
        return (
          wrapper.classList.contains('product__dropdown_wr--heel') ||
          wrapper.classList.contains('product__dropdown_wr--extras')
        );
      }

      function collectConfigFields() {
        const fields = {};
        container.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => {
          if (!el.name || el.disabled) return;
          if (el.type === 'file' || el.type === 'submit' || el.type === 'button') return;
          if (el.name === 'quantity' || el.name === 'form_type' || el.name === 'utf8') return;

          if (el.type === 'radio') {
            if (el.checked) fields[el.name] = el.value;
            return;
          }
          if (el.type === 'checkbox') {
            if (!Array.isArray(fields[el.name])) fields[el.name] = [];
            if (!el.checked) return;
            let value = el.value;
            if (!value && (el.name === 'product__upsell' || el.name === 'product__extras')) {
              const item = el.closest('.product__upsell_item');
              const variants = parseUpsellVariants(item);
              if (variants.length) {
                const selectedOptions = {};
                item?.querySelectorAll('.option-group').forEach((group) => {
                  const idx = parseInt(group.dataset.optionIndex, 10) + 1;
                  const active = group.querySelector('.product__upsell_item_variant.active');
                  if (active) selectedOptions[`option${idx}`] = active.dataset.value;
                });
                const matched = variants.find((variant) =>
                  Object.keys(selectedOptions).every((key) => variant[key] === selectedOptions[key])
                );
                value = String((matched || variants[0]).id);
                el.value = value;
              }
            }
            if (value !== '') fields[el.name].push(String(value));
            return;
          }
          fields[el.name] = el.value;
        });
        return fields;
      }

      function parseUpsellVariants(item) {
        try {
          const raw = item?.dataset?.variants;
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function syncUpsellItemToVariant(item, variant) {
        if (!item || !variant) return;
        const checkbox = item.querySelector('input[name="product__upsell"], input[name="product__extras"]');
        if (!checkbox) return;

        item.querySelectorAll('.option-group').forEach((group) => {
          const idx = parseInt(group.dataset.optionIndex, 10) + 1;
          const optVal = variant[`option${idx}`];
          if (optVal == null) return;
          group.querySelectorAll('.product__upsell_item_variant').forEach((btn) => {
            const match = String(btn.dataset.value || '') === String(optVal);
            btn.classList.toggle('active', match);
            if (match) {
              const optionValueDiv = group.querySelector('.option_value');
              if (optionValueDiv) {
                optionValueDiv.textContent = (btn.dataset.label || '').trim() || btn.dataset.value || '';
              }
            }
          });
        });

        checkbox.value = String(variant.id);
        if (variant.price != null) checkbox.dataset.price = variant.price;
      }

      function applyUpsellExtrasSelections(fields) {
        if (!fields || typeof fields !== 'object') return;

        ['product__upsell', 'product__extras'].forEach((name) => {
          const selectedIds = Array.isArray(fields[name])
            ? fields[name].map(String).filter((id) => id !== '')
            : [];

          container.querySelectorAll(`input[name="${name}"]`).forEach((checkbox) => {
            checkbox.checked = false;
            const item = checkbox.closest('.product__upsell_item');
            if (item) item.classList.remove('active');
          });

          selectedIds.forEach((variantId) => {
            const items = container.querySelectorAll('.product__upsell_item');
            for (const item of items) {
              const checkbox = item.querySelector(`input[name="${name}"]`);
              if (!checkbox) continue;

              const variants = parseUpsellVariants(item);
              const matchedVariant = variants.find((v) => String(v.id) === String(variantId));
              if (!matchedVariant && String(checkbox.value) !== String(variantId)) continue;

              if (matchedVariant) {
                syncUpsellItemToVariant(item, matchedVariant);
              } else {
                checkbox.value = String(variantId);
              }

              checkbox.checked = true;
              item.classList.add('active');
              break;
            }
          });
        });

        const variantRadios = document.querySelector('variant-radios');
        if (variantRadios && typeof variantRadios.updatePrices === 'function') {
          variantRadios.updatePrices();
        }
      }

      function collectCompletedStepKeys() {
        const keys = [];
        if (configIntro && configIntro.classList.contains('complete')) keys.push('intro');
        faqWrappers.forEach((wrapper) => {
          // Heel/extras ship with super_done in markup — only track explicit .complete
          if (isOptionalConfigStep(wrapper)) {
            if (wrapper.classList.contains('complete')) keys.push(getStepKey(wrapper));
            return;
          }
          const inner = wrapper.querySelector('.product__dropdown_inner');
          if (wrapper.classList.contains('complete') || (inner && inner.classList.contains('super_done'))) {
            keys.push(getStepKey(wrapper));
          }
        });
        return keys;
      }

      function getOpenStepKey() {
        const open = container.querySelector('.product__dropdown_wr.open');
        return open ? getStepKey(open) : null;
      }

      function saveConfigState() {
        if (!container.classList.contains('evamats-config')) return;
        const identity = getConfigProductIdentity();
        if (!identity.handle) return;
        const payload = {
          productHandle: identity.handle,
          productId: identity.id,
          fields: collectConfigFields(),
          completedSteps: collectCompletedStepKeys(),
          openStep: getOpenStepKey(),
          savedAt: Date.now()
        };
        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          /* ignore quota */
        }
      }

      function scheduleSaveConfigState() {
        clearTimeout(saveConfigTimer);
        saveConfigTimer = setTimeout(saveConfigState, 200);
      }

      function clearConfigState() {
        try {
          localStorage.removeItem(CONFIG_STORAGE_KEY);
        } catch (e) {
          /* ignore */
        }
      }

      function readConfigState() {
        try {
          const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      }

      function applyConfigFields(fields) {
        if (!fields || typeof fields !== 'object') return;
        container.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => {
          if (!el.name || !(el.name in fields)) return;
          if (el.name === 'product__upsell' || el.name === 'product__extras') return;
          const value = fields[el.name];
          if (el.type === 'radio') {
            el.checked = String(el.value) === String(value);
            return;
          }
          if (el.type === 'checkbox') {
            const list = Array.isArray(value) ? value.map(String) : [String(value)];
            el.checked = list.includes(String(el.value));
            return;
          }
          el.value = value == null ? '' : value;
        });
        applyUpsellExtrasSelections(fields);
      }

      function markConfigStepComplete(wrapper) {
        if (!wrapper) return;
        if (isIntroStep(wrapper)) {
          wrapper.classList.add('complete');
          return;
        }
        wrapper.classList.remove('disabled', 'open');
        wrapper.classList.add('complete');
        const inner = wrapper.querySelector('.product__dropdown_inner');
        if (inner) {
          inner.classList.add('done', 'super_done');
          inner.classList.remove('open');
        }
      }

      function findStepByKey(key) {
        if (key === 'intro') return configIntro;
        return Array.from(faqWrappers).find((wrapper) => getStepKey(wrapper) === key) || null;
      }

      function restoreConfigSteps(completedSteps, openStepKey) {
        const completed = Array.isArray(completedSteps)
          ? completedSteps.filter((key) => key !== 'heel' && key !== 'extras')
          : [];
        const mainSteps = getAllMainDropdowns(container);

        faqWrappers.forEach((wrapper) => {
          wrapper.classList.remove('open', 'complete');
          const inner = wrapper.querySelector('.product__dropdown_inner');
          if (inner && !isOptionalConfigStep(wrapper)) {
            inner.classList.remove('open', 'done', 'super_done');
          }
          if (!isOptionalConfigStep(wrapper)) {
            wrapper.classList.add('disabled');
          } else {
            wrapper.classList.add('disabled');
          }
        });

        if (configIntro) {
          configIntro.classList.remove('complete');
        }

        let unlocked = !configIntro;
        if (configIntro && completed.includes('intro') && validateStep(configIntro, false)) {
          markConfigStepComplete(configIntro);
          unlocked = true;
        }

        mainSteps.forEach((step) => {
          const key = getStepKey(step);
          if (isOptionalConfigStep(step)) return;

          if (unlocked) step.classList.remove('disabled');

          if (completed.includes(key) && validateStep(step, false)) {
            markConfigStepComplete(step);
            unlocked = true;
          } else {
            unlocked = false;
          }
        });

        // Heel / extras unlock only after all required steps with Continue are done
        const requiredDone = mainSteps
          .filter((step) => !isOptionalConfigStep(step) && step.querySelector('.product__dropdown_button'))
          .every((step) => {
            const inner = step.querySelector('.product__dropdown_inner');
            return step.classList.contains('complete') || (inner && inner.classList.contains('super_done'));
          });
        if (requiredDone) {
          faqWrappers.forEach((wrapper) => {
            if (isOptionalConfigStep(wrapper)) wrapper.classList.remove('disabled');
          });
        }

        faqWrappers.forEach((wrapper) => {
          wrapper.classList.remove('open');
          const inner = wrapper.querySelector('.product__dropdown_inner');
          if (inner && !isOptionalConfigStep(wrapper) && !inner.classList.contains('super_done')) {
            inner.classList.remove('open');
          }
        });

        let toOpen = openStepKey ? findStepByKey(openStepKey) : null;
        if (toOpen && (toOpen.classList.contains('disabled') || isOptionalConfigStep(toOpen))) {
          toOpen = null;
        }

        if (!toOpen) {
          const incomplete = mainSteps.find((step) => {
            if (isOptionalConfigStep(step)) return false;
            if (step.classList.contains('disabled')) return false;
            const inner = step.querySelector('.product__dropdown_inner');
            return !(step.classList.contains('complete') || (inner && inner.classList.contains('super_done')));
          });
          toOpen = incomplete || null;
        }

        if (toOpen && !isIntroStep(toOpen)) {
          toOpen.classList.remove('disabled');
          toOpen.classList.add('open');
          const inner = toOpen.querySelector('.product__dropdown_inner');
          if (inner) {
            inner.classList.add('open');
            inner.classList.remove('done');
          }
        } else if ((!configIntro || configIntro.classList.contains('complete')) && requiredDone) {
          const heel = container.querySelector('.product__dropdown_wr--heel');
          if (heel && !heel.classList.contains('disabled')) {
            heel.classList.add('open');
            const heelInner = heel.querySelector('.product__dropdown_inner');
            if (heelInner) heelInner.classList.add('open');
          }
        } else if (!configIntro || configIntro.classList.contains('complete')) {
          openFirstConfigStepDemo();
        }
      }

      function restoreConfigState() {
        if (!container.classList.contains('evamats-config')) return false;
        const identity = getConfigProductIdentity();
        const saved = readConfigState();
        if (!saved || !identity.handle) {
          return false;
        }
        if (saved.productHandle !== identity.handle) {
          clearConfigState();
          return false;
        }

        isRestoringConfig = true;
        try {
          applyConfigFields(saved.fields || {});
          if (typeof filterZestawByBodyType === 'function') filterZestawByBodyType();
          applyConfigFields(saved.fields || {});

          restoreConfigSteps(saved.completedSteps || [], saved.openStep || null);

          container.querySelectorAll('input:checked, select, textarea').forEach((el) => {
            if (el.matches('input[type="radio"]:checked, input[type="checkbox"]:checked, select, textarea')) {
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Re-apply step open/complete after change handlers (filters, titles)
          restoreConfigSteps(saved.completedSteps || [], saved.openStep || null);

          window.__evamatsRefreshConfigImagePreview?.();
          if (typeof updateConfigStepStatuses === 'function') updateConfigStepStatuses();

          container.querySelectorAll('.product-form__input--dropdown select').forEach((select) => {
            const titleValue = select.closest('fieldset')?.querySelector('.lip__title_value');
            if (titleValue) titleValue.textContent = select.value || '';
          });
          container.querySelectorAll('.lip__field input:checked').forEach((input) => {
            const titleValue = input.closest('.lip__field')?.querySelector('.lip__title_value');
            if (titleValue && input.dataset.title) {
              titleValue.textContent =
                typeof window.evamatsStripBrandLabel === 'function'
                  ? window.evamatsStripBrandLabel(input.dataset.title)
                  : input.dataset.title;
            }
          });

          if (configIntro) updateContinueButton(configIntro);
          faqWrappers.forEach((wrapper) => updateContinueButton(wrapper));
          if (container.querySelector('.application_form__next_button')) {
            updateNextButtonState(container);
          }
        } finally {
          isRestoringConfig = false;
        }

        // Year select is reversed on DOMContentLoaded in product.js — re-apply after that queue
        const savedFields = saved.fields || {};
        const savedSteps = saved.completedSteps || [];
        const savedOpen = saved.openStep || null;
        const reapplySavedUpsells = () => {
          isRestoringConfig = true;
          try {
            applyUpsellExtrasSelections(savedFields);
            if (typeof updateConfigStepStatuses === 'function') updateConfigStepStatuses();
          } finally {
            isRestoringConfig = false;
          }
        };

        setTimeout(() => {
          isRestoringConfig = true;
          try {
            applyConfigFields(savedFields);
            restoreConfigSteps(savedSteps, savedOpen);
            const yearSelect = container.querySelector('#rok-produkcji, select[name*="Year"], select[name*="year"], select[name*="Rok"], select[name*="rok"]');
            if (yearSelect && yearSelect.value) {
              const titleValue = yearSelect.closest('fieldset')?.querySelector('.lip__title_value');
              if (titleValue) titleValue.textContent = yearSelect.value;
              const yearScope = yearSelect.closest('[data-config-intro]') || yearSelect.closest('.product__dropdown_wr');
              const yearProperty = yearScope?.querySelector('.product__dropdown_value');
              if (yearProperty) yearProperty.textContent = yearSelect.value;
            }
            if (configIntro) updateContinueButton(configIntro);
            faqWrappers.forEach((wrapper) => updateContinueButton(wrapper));
            if (typeof updateConfigStepStatuses === 'function') updateConfigStepStatuses();
          } finally {
            isRestoringConfig = false;
          }
          saveConfigState();
          document.dispatchEvent(new CustomEvent('evamats:config-step-updated'));
        }, 0);

        // Upsell variant init (IntersectionObserver in custom.js) may overwrite values later
        setTimeout(reapplySavedUpsells, 400);
        setTimeout(reapplySavedUpsells, 1200);

        return true;
      }

      const restored = restoreConfigState();
      if (!restored) {
        if (!configIntro) openFirstConfigStepDemo();
        if (typeof updateConfigStepStatuses === 'function') updateConfigStepStatuses();
      }

      container.addEventListener('change', scheduleSaveConfigState, true);
      container.addEventListener('input', scheduleSaveConfigState, true);
      container.addEventListener(
        'click',
        (e) => {
          if (e.target.closest('.product__upsell_item_variant')) scheduleSaveConfigState();
        },
        true
      );
      document.addEventListener('evamats:config-step-updated', scheduleSaveConfigState);
  
      function updateNextButtonState(container) {
        if (!container) return;

        const steps = container.querySelectorAll('.product__dropdown_wr');
        const nextButton = container.querySelector('.application_form__next_button');

        if (!steps || steps.length === 0) return;
  
        let allCompleted = true;
        steps.forEach(step => {
          if (step.classList.contains('product__dropdown_wr--heel') || step.classList.contains('product__dropdown_wr--extras')) {
            return;
          }
          if (!step.querySelector('.product__dropdown_button')) {
            return;
          }
  
          const inner = step.querySelector('.product__dropdown_inner');
          if (!inner || !inner.classList.contains('super_done')) {
            allCompleted = false;
          }
        });
  
        if (!nextButton) return;

        if (allCompleted) {
          nextButton.disabled = false;
          nextButton.classList.remove('disabled-button');
        } else {
          nextButton.disabled = true;
          nextButton.classList.add('disabled-button');
        }
      }
  
      function setFollowingStepsDisabled(currentWrapper, disabled) {
        const scope = currentWrapper.closest('.config_container') || container;
        let following = [];

        if (isIntroStep(currentWrapper)) {
          following = getAllMainDropdowns(scope);
        } else {
          const dropdowns = getAllMainDropdowns(scope);
          const currentIndex = dropdowns.indexOf(currentWrapper);
          if (currentIndex >= 0) {
            following = dropdowns.slice(currentIndex + 1);
          }
        }

        following.forEach(function (next) {
          if (next.classList.contains('product__dropdown_wr--heel') || next.classList.contains('product__dropdown_wr--extras')) {
            return;
          }
          if (disabled) {
            next.classList.add('disabled');
          } else {
            next.classList.remove('disabled');
          }
        });
      }
    });
  
    
  
      
    const yearSelects = document.querySelectorAll(
      '.config_container .product-form__input--dropdown select.select__select, .config_container [data-dropdown="year"] .select__select'
    );
    yearSelects.forEach((yearSelect) => {
      function updateYearDisplay() {
        const selectedValue = yearSelect.value;
        const titleValue = yearSelect.closest('fieldset')?.querySelector('.lip__title_value');
        if (titleValue) {
          titleValue.textContent = selectedValue;
        }
        const yearScope = yearSelect.closest('[data-config-intro]') || yearSelect.closest('.product__dropdown_wr');
        const yearProperty = yearScope?.querySelector('.product__dropdown_value');
        if (yearProperty) {
          yearProperty.textContent = selectedValue;
        }
      }
      yearSelect.addEventListener('change', updateYearDisplay);
    });

    const matsSetInputs = document.querySelectorAll('[data-name="mats_set"] input');
    const matsSetInputChecked = document.querySelector('[data-name="mats_set"] input:checked');

    const trunkTooltipMobileQuery = window.matchMedia('(max-width: 749px)');

    const positionTrunkTooltip = (trigger) => {
      const tooltip = trigger.querySelector('.trunk_message__tooltip');
      if (!tooltip) return;

      if (!trunkTooltipMobileQuery.matches) {
        tooltip.style.removeProperty('--trunk-tooltip-top');
        return;
      }

      const rect = trigger.getBoundingClientRect();
      tooltip.style.setProperty('--trunk-tooltip-top', `${rect.bottom + 10}px`);
    };

    const resetTrunkTooltipPosition = (trigger) => {
      trigger.querySelector('.trunk_message__tooltip')?.style.removeProperty('--trunk-tooltip-top');
    };

    document.querySelectorAll('.trunk_message').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = trigger.classList.contains('is-tooltip-open');
        document.querySelectorAll('.trunk_message.is-tooltip-open').forEach((el) => {
          el.classList.remove('is-tooltip-open');
          resetTrunkTooltipPosition(el);
        });
        if (!isOpen) {
          positionTrunkTooltip(trigger);
          trigger.classList.add('is-tooltip-open');
        }
      });

      trigger.addEventListener('focusin', () => {
        if (trunkTooltipMobileQuery.matches) positionTrunkTooltip(trigger);
      });

      trigger.addEventListener('focusout', () => {
        resetTrunkTooltipPosition(trigger);
      });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.trunk_message')) return;
      document.querySelectorAll('.trunk_message.is-tooltip-open').forEach((el) => {
        el.classList.remove('is-tooltip-open');
        resetTrunkTooltipPosition(el);
      });
    });

    const normalize = (str) => (str || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const shouldHideHeelMount = (input) => {
      if (!input) return false;
      const title = normalize(input.dataset.title || input.value || '');
      const hideValues = [
        // EN
        'rear',
        'trunk',
        // CS
        'zadni',
        'kufr',
        // DE
        'hinteren',
        'stamm'
      ];
      return hideValues.includes(title);
    };

    const syncHeelMountGroupsVisibility = (input) => {
      const hideMount = shouldHideHeelMount(input);
      const mountGroups = document.querySelectorAll('.product__dropdown_wr--heel .option-group');
      if (!mountGroups.length) return;

      mountGroups.forEach((group) => {
        const groupName = normalize(group.getAttribute('data-group'));
        const isMountGroup = (
          groupName === 'montaz'
          || groupName === 'mount'
          || groupName === 'montage'
          || groupName === 'montovano'
        );
        if (!isMountGroup) return;

        group.style.display = hideMount ? 'none' : '';

        if (hideMount) {
          const activeBtn = group.querySelector('.product__upsell_item_variant.active');
          const shouldSwitch = activeBtn && (activeBtn.dataset.value || '').includes('+');
          if (shouldSwitch) {
            const unmountedBtn = Array.from(group.querySelectorAll('.product__upsell_item_variant'))
              .find((btn) => !((btn.dataset.value || '').includes('+')));
            if (unmountedBtn) {
              unmountedBtn.click();
            }
          }
        }
      });
    };

    if (matsSetInputs.length > 0) {
      matsSetInputs.forEach(input => {
        input.addEventListener('change', function () {
          syncHeelMountGroupsVisibility(input);
        });
      });
    }
    syncHeelMountGroupsVisibility(matsSetInputChecked);

    function formatExtrasMoney(cents, fallbackEl) {
      if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        return window.Shopify.formatMoney(cents);
      }
      const currency = (fallbackEl?.textContent || '').replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
      const amount = (Number(cents) || 0) / 100;
      return `${amount.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`.trim();
    }

    function updateExtrasPriceRow(item, variant) {
      const priceRow = item.querySelector('.product__upsell_price-row');
      if (!priceRow || !variant) return;

      const regularEl = priceRow.querySelector('.product__upsell_price');
      const compareEl = priceRow.querySelector('.product__upsell_price_compare');
      const discountEl = priceRow.querySelector('.product__upsell_discount');

      if (regularEl) {
        regularEl.textContent = formatExtrasMoney(variant.price, regularEl);
      }

      if (!compareEl || !discountEl) return;

      const compareCents = variant.compare_at_price;
      if (compareCents && compareCents > variant.price) {
        compareEl.textContent = formatExtrasMoney(compareCents, compareEl);
        compareEl.classList.remove('hidden');
        const discountValueEl = discountEl.querySelector('.product__upsell_discount__value');
        (discountValueEl || discountEl).textContent = `-${Math.round(((compareCents - variant.price) / compareCents) * 100)}%`;
        discountEl.classList.remove('hidden');
      } else {
        compareEl.classList.add('hidden');
        discountEl.classList.add('hidden');
      }
    }

    document.addEventListener('change', (e) => {
      const extrasWrapper = e.target.closest && e.target.closest('.product__dropdown_wr--extras');
      if (extrasWrapper && e.target.matches('input[name="product__extras"]')) {
        const item = e.target.closest('.product__upsell_item');
        if (item) {
          item.classList.toggle('active', e.target.checked);
        }
        const variantRadios = document.querySelector('variant-radios');
        if (variantRadios && typeof variantRadios.updatePrices === 'function') {
          variantRadios.updatePrices();
        }
      }
    }, true);

    document.addEventListener('click', function (e) {
      if (!e.target.classList.contains('product__upsell_item_variant')) return;
      const extrasWrapper = e.target.closest('.product__dropdown_wr--extras');
      if (!extrasWrapper) return;

      const groupContainer = e.target.closest('.option-group');
      const item = e.target.closest('.product__upsell_item');
      if (!groupContainer || !item) return;

      const checkbox = item.querySelector('input[name="product__extras"]');
      const variantsJson = item.dataset.variants;
      if (!checkbox || !variantsJson) return;

      const variants = JSON.parse(variantsJson);
      groupContainer.querySelectorAll('.product__upsell_item_variant').forEach((el) => el.classList.remove('active'));
      e.target.classList.add('active');

      const groups = item.querySelectorAll('.option-group');
      const selectedOptions = {};
      groups.forEach((group) => {
        const idx = parseInt(group.dataset.optionIndex, 10) + 1;
        const active = group.querySelector('.product__upsell_item_variant.active');
        if (active) selectedOptions[`option${idx}`] = active.dataset.value;
      });

      const matching = variants.find((v) => Object.keys(selectedOptions).every((k) => v[k] === selectedOptions[k]));
      if (matching) {
        checkbox.value = matching.id;
        checkbox.dataset.price = matching.price;
        updateExtrasPriceRow(item, matching);
      }
    }, true);
  }
})();


// config steps


(function () {
  if (!document.querySelector('.config_container, .application_form__content.config_container, .lip__field')) return;

  function isGiftCardAmountField(field) {
    return (
      field &&
      (field.id === 'gift-card-amount' || field.classList.contains('evamats-product-option--amount'))
    );
  }

  function syncTitleValue(field, control) {
    if (isGiftCardAmountField(field)) return;

    const titleEl = field.querySelector('.lip__title_value');
    if (!titleEl) return;
    const value = control.tagName === 'SELECT'
      ? (control.options[control.selectedIndex]?.value || '')
      : control.value;
    titleEl.textContent = value;
  }

  document.querySelectorAll('.lip__field').forEach((field) => {
    if (isGiftCardAmountField(field)) return;

    field.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => syncTitleValue(field, input));
    });
  });

  document.querySelectorAll('.product-form__input--dropdown').forEach((field) => {
    const select = field.querySelector('select');
    if (select) {
      select.addEventListener('change', () => syncTitleValue(field, select));
    }
  });
})();


// toggle class in upsell item (product__extras handled above)
(function () {
  const inputs = document.querySelectorAll('input[name="product__upsell"]');
  if (!inputs.length) return;

  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      const upsellItem = input.closest('.product__upsell_item');
      if (!upsellItem) return;
      upsellItem.classList.toggle('active', input.checked);
      const variantRadios = document.querySelector('variant-radios');
      if (variantRadios && typeof variantRadios.updatePrices === 'function') {
        variantRadios.updatePrices();
      }
    });
  });
})();