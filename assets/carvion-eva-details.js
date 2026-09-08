(() => {
  'use strict';
  if (window.__carvionEvaDetails) return;
  window.__carvionEvaDetails = true;
  function init() {
    document.querySelectorAll('[data-eva-details]').forEach(dialog => {
      if (dialog.dataset.evaReady) return;
      dialog.dataset.evaReady = 'true';
      const stage = dialog.querySelector('[data-eva-stage]');
      const img = stage.querySelector('img');
      const zoom = dialog.querySelector('[data-eva-zoom]');
      const features = dialog.querySelectorAll('[data-eva-feature]');
      const positions = {cells: ['46%', '47%'], edging: ['74%', '58%'], fixing: ['47%', '68%']};
      const imageState = state => {
        stage.dataset.state = state;
        stage.querySelector('[data-eva-loading]').hidden = state !== 'loading';
        stage.querySelector('[data-eva-error]').hidden = state !== 'error';
        zoom.disabled = state !== 'success';
      };
      if (!img) imageState('error');
      else {
        img.addEventListener('load', () => imageState('success'));
        img.addEventListener('error', () => imageState('error'));
        if (img.complete) imageState(img.naturalWidth ? 'success' : 'error');
      }
      dialog.addEventListener('click', event => {
        const feature = event.target.closest('[data-eva-feature]');
        if (feature && dialog.contains(feature)) {
          const key = feature.dataset.evaFeature;
          if (!positions[key]) return;
          features.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.evaFeature === key)));
          dialog.querySelectorAll('[data-eva-panel]').forEach(panel => {panel.hidden = panel.dataset.evaPanel !== key;});
          stage.style.setProperty('--eva-x', positions[key][0]);
          stage.style.setProperty('--eva-y', positions[key][1]);
        }
        if (event.target.closest('[data-eva-zoom]') && !zoom.disabled) {
          const active = zoom.getAttribute('aria-pressed') !== 'true';
          zoom.setAttribute('aria-pressed', String(active));
          stage.dataset.zoomed = String(active);
        }
      });
      dialog.addEventListener('close', () => {
        zoom.setAttribute('aria-pressed', 'false');
        stage.dataset.zoomed = 'false';
      });
    });
  }
  document.addEventListener('shopify:section:load', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
