document.addEventListener('DOMContentLoaded', function () {
    // Получение значений по умолчанию
    let initialautoType
    let autoType
    if (document.querySelector('.product')) {
      initialautoType = document.querySelector('.product').dataset.type;  // Тип авто
      autoType = document.querySelector('.product').dataset.type;  // Тип авто
    } else {
      autoType = '5os'
    }
    
    const productContainer = document.querySelector('.product.config_container')
    const popupContainer = document.querySelector('.application_form__content.config_container')
    const lipFields = document.querySelectorAll('.lip__field')

    const patternClassMap = {
      diamonds: 'diamonds',
      honey: 'honey',
      drop: 'drop'
    };

    // Базовый путь к изображениям 
    const basePath = "https://cdn.shopify.com/s/files/1/0790/9218/7414/files/";
    const typeMapping = {
      '7os': '5os', 'pickup': '5os', 'pickup2kabina': '5os', '2os': '5os',
      'van_maly': '5os', 'electro': '5os', 'custom': '5os', 'electro_7os': '5os',
      'van_duzy': 'VAN', 'camper': 'VAN', 'tractor': 'VAN', 'bus_solid': 'VAN',
      'van_duzy_solid': 'VAN', 'van_duzy_solid_2_row': 'VAN',
      'van_duzy_separate': 'bus', 'van_duzy_separate_2_row': 'bus',
      'minivan_mini': 'minivan'
    };
    autoType = typeMapping[autoType] || autoType;

    function getEffectiveBodyTypeForImage() {
      const productEl = document.querySelector('.product');
      const raw = productEl ? (productEl.dataset.type || '').trim() : '';
      if (!raw) return null;
      if (raw.indexOf(',') >= 0) {
        const yearWr = document.querySelector('[data-dropdown="year"]');
        const radio = yearWr && yearWr.querySelector('.js-config-body-type:checked');
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

    function updateSelectedValueText(container) {
      if (window.innerWidth >= 990 || !container) return;

      const fields = [
        { selector: '.product-form__input[data-name="mats_type"]', displaySelector: '[data-name="mats_type"]', type: 'input' },
        { selector: '.product-form__input[data-name="mats_set"]', displaySelector: '[data-name="mats_set"]', type: 'input' },
        { selector: '.lip__field[data-type="matColor"]', displaySelector: '[data-type="matColor"]', type: 'color' },
        { selector: '.lip__field[data-type="trimColor"]', displaySelector: '[data-type="trimColor"]', type: 'color' }
      ];

      fields.forEach(({ selector, displaySelector, type }) => {
        const input = container.querySelector(`${selector} input:checked`);
        if (!input) return;

        const value = input.dataset.title || input.value;
        const fieldset = container.querySelector(selector);
        const titleElement = fieldset && fieldset.querySelector('.lip__title');
        let title = '';
        if (titleElement) {
          const labelText = titleElement.querySelector('.form__label_text');
          if (labelText) {
            title = labelText.textContent.trim();
          } else {
            const clone = titleElement.cloneNode(true);
            clone.querySelectorAll('.lip__title_value, .option__price_wr').forEach((el) => el.remove());
            title = clone.textContent.replace(/\s+/g, ' ').trim();
          }
        }
        const display = container.querySelector(`.product__config_image_selected_value${displaySelector}`);

        if (display) {
          let html = title ? `${title}: <span>${value}</span>` : `<span>${value}</span>`;
          if (type === 'color' && input.nextElementSibling && input.nextElementSibling.src) {
            html += ` <img src="${input.nextElementSibling.src}" alt=""/>`;
          }
          display.innerHTML = html;
        }
      });
    }

    const typeCustomPrices = {
      noEdge: [450,450,710,550,910],
      withEdge: [550,550,910,550,1210]
    }
    
    const updateLipTitleValue = () => {
    
      lipFields.forEach(field => {
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
            field.querySelector('.lip__title_value').textContent = value;
          }
      
          if (initialautoType === 'custom') {
            const matsSetField = document.querySelector('fieldset[data-name="mats_set"]')
            const matsSetValue = document.querySelector('fieldset[data-name="mats_set"]').querySelector('input:checked').dataset.title;
            
            
  
            if (selectedMatsType && selectedmatsSet) {
              const matsTypeValue = selectedMatsType.dataset.title;
              const matsSetIndex = Array.from(selectedmatsSet.closest('fieldset').querySelectorAll('input')).indexOf(selectedmatsSet);
              const matsTypeIndex = Array.from(selectedMatsType.closest('fieldset').querySelectorAll('input')).indexOf(selectedMatsType);
      
              let price = null;
              if (matsTypeIndex == 1) {
                price = typeCustomPrices.noEdge[matsSetIndex];
              } else if (matsTypeIndex == 2) {
                price = typeCustomPrices.withEdge[matsSetIndex];
              }
      
              if (matsSetField.querySelector('.lip__title_value') && price !== null) {
                matsSetField.querySelector('.lip__title_value').textContent = `${matsSetValue} ${price} €`;
              }
            }
          }          
        }
      });
    };
  
    // Слушатели изменений для всех опций
    document.querySelectorAll('.product-form__input input[type="radio"], .lip__field input[type="radio"]').forEach((input) => {
      input.addEventListener('change', ()=> {
        const parentContainer = input.closest('.config_container');
        if (input.closest('.lip__field[data-type="matPattern"]')) {
          handlePatternChange(input, parentContainer);
        }
        updateMatImage(parentContainer);
        updateLipTitleValue();
        updateSelectedValueText(parentContainer);
      });
    });
  
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

    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      if (productContainer) restoreMatPattern(productContainer);
      if (popupContainer) restoreMatPattern(popupContainer);
    });

    document.addEventListener('change', function (e) {
      if (e.target.matches('.js-config-body-type') && e.target.closest('[data-dropdown="year"]')) {
        filterZestawByBodyType();
        if (productContainer) updateMatImage(productContainer);
        if (popupContainer) updateMatImage(popupContainer);
      }
    }, true);
  });

function filterZestawByBodyType() {
  const yearWr = document.querySelector('[data-dropdown="year"]');
  const bodyTypeRadio = yearWr && yearWr.querySelector('.js-config-body-type:checked');
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
let configImageInitialized = false;

function initConfigImage() {
  if (configImageInitialized) return;
  configImageInitialized = true;

  const configImage = document.querySelector('.product__config_image--main.product__config_image--mobile');
  const matPatternsColors = document.querySelector('[data-dropdown="mats_set_type"]');
  const matPatternsColorsAdditional = document.querySelector('[data-dropdown="mat_patterns_colors"]');

  if (!configImage || (!matPatternsColors && !matPatternsColorsAdditional)) return;

  let isFirst = matPatternsColorsAdditional && matPatternsColorsAdditional.closest('.product__dropdown_wr') === document.querySelector('.product__dropdown_wr');

  function toggleVisibility() {
    if (window.innerWidth < 990) {
      configImage.classList.add('is-fixed');
      const isDropdownOpen = (matPatternsColors && matPatternsColors.classList.contains('open')) ||
        (matPatternsColorsAdditional && matPatternsColorsAdditional.classList.contains('open') && !isFirst);
      configImage.classList.toggle('fixed_hidden', !isDropdownOpen);
    } else {
      configImage.classList.remove('is-fixed', 'fixed_hidden');
    }
  }

  toggleVisibility();

  if (isFirst) {
    let counter = 0;
    window.addEventListener('scroll', () => {
      if (counter > 0) return;
      const anchor = matPatternsColors || matPatternsColorsAdditional;
      const distance = anchor && anchor.getBoundingClientRect().top;
      if (distance != null && distance <= 200) {
        isFirst = false;
        toggleVisibility();
        counter++;
      }
    }, { passive: true });
  }

  window.addEventListener('resize', toggleVisibility, { passive: true });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.product__dropdown_button')) {
      setTimeout(toggleVisibility, 500);
    }
    if (e.target.closest('.product__config_image_remove_fixed')) {
      configImage.classList.toggle('fixed_hidden');
    }
  }, true);

  [matPatternsColors, matPatternsColorsAdditional].forEach((element) => {
    if (!element) return;
    new MutationObserver(toggleVisibility).observe(element, {
      attributes: true,
      attributeFilter: ['class']
    });
  });
}

if (window.innerWidth < 990) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      initConfigImage();
      observer.disconnect();
    }
  }, { rootMargin: '100px' });

  const target = document.querySelector('.product__config_image--main');
  if (target) observer.observe(target);
}

// product sticky price
(function () {
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
          stickyConfigPriceElement.style.width = stickyConfigPriceElement.offsetWidth + 1 + 'px'
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


// config steps
(function () {
  const formContainers = document.querySelectorAll('.config_container');

  if (formContainers.length > 0) {

    formContainers.forEach(container => {
      if (!container.querySelector('.product__dropdown_wr')) return;
  
      container.querySelectorAll('fieldset .error-message').forEach(el => {
        el.style.display = 'none';
      });
  
      const faqTitles = container.querySelectorAll('.product__dropdown_title');
      const faqWrappers = container.querySelectorAll('.product__dropdown_wr');
  
      function updateMaxHeight(inner) {
        return;
      }
  
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
          requestAnimationFrame(() => {
            updateMaxHeight(inner);
          });
          inner.classList.remove("done");
        }
      }
  
      faqTitles.forEach(title => {
        title.addEventListener('click', function () {
          triggerFaq(this);
        });
      });

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

      function hideFieldsetErrorIfValid(fieldset) {
        if (!fieldset) return;
        if (fieldsetIsValid(fieldset)) {
          const errorMessage = fieldset.querySelector('.error-message');
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
          const fieldset = element.closest('fieldset');
          if (!valid) {
            stepValid = false;
            if (showErrors && fieldset) {
              const errorMessage = fieldset.querySelector('.error-message');
              if (errorMessage) {
                errorMessage.style.display = 'block';
              }
            }
          } else {
            if (showErrors && fieldset) {
              const errorMessage = fieldset.querySelector('.error-message');
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
  
      document.querySelectorAll('.product__dropdown_wr').forEach(wrapper => {
        updateContinueButton(wrapper);
      });
  
      faqWrappers.forEach(wrapper => {
        updateContinueButton(wrapper);
      });
  
      document.querySelectorAll('.product__dropdown_inner input, .product__dropdown_inner select, .product__dropdown_inner textarea').forEach(element => {
        function onFieldInteraction() {
          const wrapper = this.closest('.product__dropdown_wr');
          if (wrapper) updateContinueButton(wrapper);
          hideFieldsetErrorIfValid(this.closest('fieldset'));
        }
        element.addEventListener('input', onFieldInteraction);
        element.addEventListener('change', onFieldInteraction);
      });
      // update step height after input change
      document.querySelectorAll('[data-name="mats_set"] input').forEach(element => {
        element.addEventListener('change', function () {
          const wrapper = this.closest('.product__dropdown_wr');
          const inner = wrapper.querySelector('.product__dropdown_inner');
          if (inner.classList.contains('open')) {
            requestAnimationFrame(() => {
              updateMaxHeight(inner);
            });
          }
        });
      })
      // update step height after input change
  
      function revalidate(e) {
        const wrapper = e.target.closest('.product__dropdown_wr');
        if (!wrapper) return;
        const inner = wrapper.querySelector('.product__dropdown_inner');
  
        const isValid = validateStep(wrapper, false);
  
        if (!isValid) {
          inner.classList.remove('super_done');
          setFollowingStepsDisabled(wrapper, true);
        }
  
        updateContinueButton(wrapper);
        hideFieldsetErrorIfValid(e.target.closest('fieldset'));
        if (container.querySelector('.application_form__next_button')) {
          updateNextButtonState(container);          
        }
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
          const wrapper = button.closest('.product__dropdown_wr');
          const inner = wrapper.querySelector('.product__dropdown_inner');
  
          requestAnimationFrame(() => {
            updateMaxHeight(inner);
          });
  
          if (!validateStep(wrapper, true)) {
            updateContinueButton(wrapper);
            requestAnimationFrame(() => {
              updateMaxHeight(inner);
            });
            return;
          }
  
          wrapper.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
          });
  
          wrapper.classList.remove('open');
          wrapper.classList.add('complete');
          inner.classList.remove('open');
          inner.classList.add('done', 'super_done');
  
          const nextWrapper = getNextDropdown(wrapper);
          if (nextWrapper) {
            nextWrapper.classList.add('open');
            nextWrapper.classList.remove('disabled');
            nextWrapper.querySelector('.product__dropdown_inner').classList.remove('done');
            const nextInner = nextWrapper.querySelector('.product__dropdown_inner');
            nextInner.classList.add('open');

            if (nextWrapper.getAttribute('data-dropdown') === 'mats_set_type') {
              filterZestawByBodyType();
            }

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
          }
  
          if (container.querySelector('.application_form__next_button')) {
            updateNextButtonState(container);          
          }
          goToNextStep();  // Переход к следующему шагу
        });
      });
  
      function getNextDropdown(current) {
        let next = current.nextElementSibling;
        while (next) {
          if (next.classList.contains('product__dropdown_wr') && !next.classList.contains('product__dropdown_wr--extras')) {
            next.classList.remove('disabled');
            return next;
          }
          next = next.nextElementSibling;
        }
        return null;
      }
  
      const stepWrappers = Array.from(faqWrappers).filter(wrapper => !wrapper.classList.contains('product__dropdown_wr--heel') && !wrapper.classList.contains('product__dropdown_wr--extras'));
      stepWrappers.forEach((wrapper, i) => {
        const title = wrapper.querySelector('.product__dropdown_title');
        title.innerHTML = `${i + 1}. ${title.innerHTML}`;
        if (i === 0) {
          wrapper.classList.add('open');
          wrapper.querySelector('.product__dropdown_inner').classList.add('open');
          wrapper.classList.remove('disabled');
        }
      });
  
      function updateNextButtonState(container) {
        if (!container) {
          console.error("Container not found!");
          return;
        }
  
        const steps = container.querySelectorAll('.product__dropdown_wr');
        const nextButton = container.querySelector('.application_form__next_button');
  
        if (!steps || steps.length === 0) {
          console.error("No steps found in the container!");
          return;
        }
  
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
  
        if (nextButton) {
          if (allCompleted) {
            nextButton.disabled = false;
            nextButton.classList.remove('disabled-button');
          } else {
            nextButton.disabled = true;
            nextButton.classList.add('disabled-button');
          }
        } else {
          console.error("Next button not found!");
        }
      }
  
      function setFollowingStepsDisabled(currentWrapper, disabled) {
        let next = currentWrapper.nextElementSibling;
        while (next) {
          if (next.classList.contains('product__dropdown_wr') && !next.classList.contains('product__dropdown_wr--heel') && !next.classList.contains('product__dropdown_wr--extras')) {
            if (disabled) {
              next.classList.add('disabled');
              // next.querySelector('.product__dropdown_inner').classList.remove('done')
            } else {
              next.classList.remove('disabled');
              
            }
          }
          next = next.nextElementSibling;
        }
      }
    });
  
    
  
      
    const yearSelect = document.querySelector('[data-dropdown="year"] .select__select');
    if (yearSelect) {
      yearSelect.addEventListener('change', function () {
        const selectedOption = this.options[this.selectedIndex];
        const selectedValue = selectedOption.value;
        const yearProperty = yearSelect.closest('.product__dropdown_wr').querySelector('.product__dropdown_value');
        if (yearProperty) {
          yearProperty.textContent = selectedValue;
        }
      });
    }

    const matsSetInputs = document.querySelectorAll('[data-name="mats_set"] input');
    const matsSetInputChecked = document.querySelector('[data-name="mats_set"] input:checked');
    const labelTrunk = document.querySelector('.label_trunk');

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
          || groupName === 'montaz'
          || groupName === 'mount'
          || groupName === 'montage'
          || groupName === 'montovano'
          || groupName === 'montaz'
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

    const showTrunkLabel = (input) => {
      if (!input || !labelTrunk) return;
      if (input.classList.contains('input_trunk')) {
        labelTrunk.classList.remove('hidden');
      } else {
        labelTrunk.classList.add('hidden');
      }
    };
    if (matsSetInputs.length > 0) {
      matsSetInputs.forEach(input => {
        input.addEventListener('change', function () {
          showTrunkLabel(input);
          syncHeelMountGroupsVisibility(input);
        });
      });
    }
    showTrunkLabel(matsSetInputChecked);
    syncHeelMountGroupsVisibility(matsSetInputChecked);

    document.addEventListener('change', (e) => {
      const extrasWrapper = e.target.closest && e.target.closest('.product__dropdown_wr--extras');
      if (extrasWrapper && e.target.matches('input[name="product__extras"]')) {
        const item = e.target.closest('.product__upsell_item');
        if (item) {
          item.classList.toggle('active', e.target.checked);
        }
        const valueEl = extrasWrapper.querySelector('.product__dropdown_value');
        if (valueEl) {
          const checked = extrasWrapper.querySelectorAll('input[name="product__extras"]:checked');
          valueEl.textContent = checked.length
            ? Array.from(checked).map((inp) => inp.getAttribute('data-title') || inp.value).join(', ')
            : '';
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
      }
    }, true);
  }
})();


// config steps


(function () {
  const valueFields = document.querySelectorAll('.lip__field');
  if (valueFields) {
    valueFields.forEach(field => {
      const inputs = field.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          const value = input.value;
          field.querySelector('.lip__title_value').textContent = value;
        });
      });
    });
  }
})();


// toggle class in upsell item
(function () {
  const inputs = document.querySelectorAll('input[name="product__upsell"], input[name="product__extras"]')
  if (!inputs.length) return;

  inputs.forEach(input => {
    input.addEventListener('change', () => {
      const upsellItem = input.closest('.product__upsell_item')
      if (input.checked) {
        upsellItem.classList.add('active')
      } else {
        upsellItem.classList.remove('active')
      }
      const variantRadios = document.querySelector('variant-radios');
      if (variantRadios && typeof variantRadios.updatePrices === 'function') {
        variantRadios.updatePrices();
      }
    })
  })
})();
// toggle class in upsell item