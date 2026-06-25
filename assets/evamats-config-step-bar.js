(function () {
  'use strict';

  function initStepBar(root) {
    const container = root.closest('.config_container') || document.querySelector('.config_container');
    if (!container) return;

    const nextBtn = root.querySelector('[data-step-bar-next]');
    const cartBtn = root.querySelector('[data-step-bar-cart]');
    const progressEl = root.querySelector('[data-step-bar-progress]');
    const hintEl = root.querySelector('[data-step-bar-hint]');
    const thumbEl = root.querySelector('[data-step-bar-thumb]');
    const progressTemplate = root.dataset.progressTemplate || '{{ current }} of {{ total }} selected';

    let updatingBar = false;
    let updateBarTimer;

    function scheduleUpdateBar() {
      clearTimeout(updateBarTimer);
      updateBarTimer = setTimeout(updateBar, 50);
    }

    function getMainSteps() {
      const steps = [];
      const intro = container.querySelector('[data-config-intro]');
      if (intro && intro.querySelector('.product__dropdown_button')) {
        steps.push(intro);
      }
      steps.push.apply(steps, Array.from(container.querySelectorAll('.product__dropdown_wr')).filter(function (wrapper) {
        if (wrapper.classList.contains('product__dropdown_wr--heel')) return false;
        if (wrapper.classList.contains('product__dropdown_wr--extras')) return false;
        return wrapper.querySelector('.product__dropdown_button');
      }));
      return steps;
    }

    function isStepComplete(wrapper) {
      if (wrapper.matches('[data-config-intro]')) {
        return wrapper.classList.contains('complete');
      }
      const inner = wrapper.querySelector('.product__dropdown_inner');
      return inner && inner.classList.contains('super_done');
    }

    function getOpenStep() {
      const intro = container.querySelector('[data-config-intro]');
      if (intro && !isStepComplete(intro)) {
        return intro;
      }
      return container.querySelector('.product__dropdown_wr.open') || getMainSteps().find(function (step) {
        return !isStepComplete(step) && !step.classList.contains('disabled');
      }) || null;
    }

    function getCurrentContinueButton() {
      const openStep = getOpenStep();
      return openStep ? openStep.querySelector('.product__dropdown_button') : null;
    }

    function cleanStepTitle(wrapper) {
      if (wrapper.matches('[data-config-intro]')) {
        const legend = wrapper.querySelector('[data-name="mats_type"] .form__label_text');
        return legend ? legend.textContent.trim() : '';
      }
      const title = wrapper && wrapper.querySelector('.product__dropdown_title');
      if (!title) return '';
      const clone = title.cloneNode(true);
      clone.querySelectorAll('svg, .icon-edit, .product__dropdown_value').forEach(function (el) {
        el.remove();
      });
      return clone.textContent.replace(/:\s*$/, '').trim();
    }

    function allMainStepsDone() {
      const steps = getMainSteps();
      return steps.length > 0 && steps.every(isStepComplete);
    }

    function updateThumb() {
      if (!thumbEl) return;
      const preview =
        document.querySelector('.product__config_image--mobile_image') ||
        document.querySelector('.product__config_image--mobile img') ||
        document.querySelector('.product__config_image--desktop img');
      if (preview && preview.src && !preview.src.includes('1x1')) {
        thumbEl.src = preview.currentSrc || preview.src;
      }
    }

    function getScrollTargetForStep(wrapper) {
      if (!wrapper) return null;
      if (wrapper.matches('[data-config-intro]')) {
        return wrapper.querySelector('[data-name="mats_type"]') || wrapper;
      }
      return wrapper.querySelector('.product__dropdown_title') || wrapper;
    }

    function ensureStepVisible(wrapper) {
      if (!wrapper || wrapper.matches('[data-config-intro]')) return;
      if (!wrapper.classList.contains('open')) {
        const title = wrapper.querySelector('.product__dropdown_title');
        if (title) title.click();
      }
    }

    function scrollToStep(wrapper) {
      const target = getScrollTargetForStep(wrapper);
      if (!target) return;
      ensureStepVisible(wrapper);
      requestAnimationFrame(function () {
        const top = target.getBoundingClientRect().top + window.scrollY - 350;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    }

    function updateBar() {
      if (updatingBar || !nextBtn || !cartBtn) return;
      updatingBar = true;

      try {
        const steps = getMainSteps();
        const completed = steps.filter(isStepComplete).length;
        const openStep = getOpenStep();
        const done = allMainStepsDone();

        if (progressEl && steps.length > 0) {
          progressEl.textContent = progressTemplate
            .replace(/\{\{\s*current\s*\}\}/g, String(completed))
            .replace(/\{\{\s*total\s*\}\}/g, String(steps.length));
          progressEl.hidden = false;
        }

        if (hintEl) {
          hintEl.textContent = openStep && !done ? cleanStepTitle(openStep) : '';
          hintEl.hidden = !hintEl.textContent.trim();
        }

        const continueBtn = getCurrentContinueButton();
        const isValid = continueBtn && continueBtn.getAttribute('aria-disabled') !== 'true';

        if (done) {
          nextBtn.classList.add('hidden');
          cartBtn.classList.remove('hidden');
        } else {
          nextBtn.classList.remove('hidden');
          cartBtn.classList.add('hidden');
          nextBtn.classList.toggle('disabled-button', !isValid);
          nextBtn.removeAttribute('aria-disabled');
        }

        updateThumb();
      } finally {
        updatingBar = false;
      }
    }

    nextBtn.addEventListener('click', function () {
      const openStep = getOpenStep();
      const continueBtn = getCurrentContinueButton();
      const isValid = continueBtn && continueBtn.getAttribute('aria-disabled') !== 'true';

      if (!isValid) {
        if (openStep) {
          scrollToStep(openStep);
          if (continueBtn) continueBtn.click();
        }
        scheduleUpdateBar();
        return;
      }

      if (continueBtn) {
        continueBtn.click();
        scheduleUpdateBar();
        setTimeout(updateBar, 600);
      }
    });

    container.addEventListener('input', scheduleUpdateBar, true);
    container.addEventListener('change', scheduleUpdateBar, true);
    document.addEventListener('evamats:discount-updated', scheduleUpdateBar);
    document.addEventListener('evamats:config-step-updated', scheduleUpdateBar);

    updateBar();
    window.addEventListener('load', updateBar);
  }

  function boot() {
    document.querySelectorAll('[data-evamats-config-step-bar]').forEach(initStepBar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
