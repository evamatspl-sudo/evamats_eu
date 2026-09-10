(() => {
  'use strict';
  if (window.__carvionEvaDetails) return;
  window.__carvionEvaDetails = true;

  const selectedMatType = () => {
    const checked = document.querySelector('.product-form__input[data-name="mats_type"] input:checked');
    return checked?.dataset.name === '3d' ? '3d' : 'classic';
  };

  function init() {
    document.querySelectorAll('[data-eva-details]').forEach(dialog => {
      if (dialog.dataset.evaReady) return;
      dialog.dataset.evaReady = 'true';

      const stage = dialog.querySelector('[data-eva-stage]');
      const zoom = dialog.querySelector('[data-eva-zoom]');
      const zoomLabel = zoom.querySelector('[data-eva-zoom-label]');
      const title = dialog.querySelector('[data-eva-title]');
      const lead = dialog.querySelector('[data-eva-lead]');
      const photos = [...stage.querySelectorAll('[data-eva-photo]')];
      let type = 'classic';
      let panX = 0;
      let panY = 0;
      let drag = null;

      const activeFrame = () => photos.find(photo => photo.dataset.evaPhoto === type);
      const activePhoto = () => activeFrame()?.querySelector('img');
      const setImageState = state => {
        stage.dataset.state = state;
        stage.querySelector('[data-eva-loading]').hidden = state !== 'loading';
        stage.querySelector('[data-eva-error]').hidden = state !== 'error';
        zoom.disabled = state !== 'success';
      };
      const updateImageState = () => {
        const photo = activePhoto();
        if (!photo) return setImageState('error');
        if (!photo.complete) return setImageState('loading');
        setImageState(photo.naturalWidth ? 'success' : 'error');
      };
      const resetZoom = () => {
        drag = null;
        panX = 0;
        panY = 0;
        stage.style.setProperty('--eva-pan-x', '0px');
        stage.style.setProperty('--eva-pan-y', '0px');
        stage.dataset.dragging = 'false';
        stage.dataset.zoomed = 'false';
        zoom.setAttribute('aria-pressed', 'false');
        zoomLabel.textContent = zoom.dataset.zoomIn;
      };
      const showFeature = (group, key) => {
        group.querySelectorAll('[data-eva-feature]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.evaFeature === key)));
        group.querySelectorAll('[data-eva-panel]').forEach(panel => { panel.hidden = panel.dataset.evaPanel !== key; });
      };
      const syncType = () => {
        type = selectedMatType();
        stage.dataset.matType = type;
        resetZoom();
        photos.forEach(photo => { photo.hidden = photo.dataset.evaPhoto !== type; });
        dialog.querySelectorAll('[data-eva-group]').forEach(group => {
          group.hidden = group.dataset.evaGroup !== type;
          if (!group.hidden) showFeature(group, group.querySelector('[data-eva-feature]')?.dataset.evaFeature);
        });
        title.textContent = title.getAttribute(`data-${type}-copy`);
        lead.textContent = lead.getAttribute(`data-${type}-copy`);
        updateImageState();
      };

      photos.forEach(frame => {
        const photo = frame.querySelector('img');
        if (!photo) return;
        photo.draggable = false;
        photo.addEventListener('load', () => { if (photo === activePhoto()) setImageState('success'); });
        photo.addEventListener('error', () => { if (photo === activePhoto()) setImageState('error'); });
      });

      dialog.addEventListener('click', event => {
        const feature = event.target.closest('[data-eva-feature]');
        if (feature) {
          const group = feature.closest('[data-eva-group]');
          if (group && !group.hidden) showFeature(group, feature.dataset.evaFeature);
        }
        if (event.target.closest('[data-eva-zoom]') && !zoom.disabled) {
          const active = zoom.getAttribute('aria-pressed') !== 'true';
          if (!active) resetZoom();
          else {
            stage.dataset.zoomed = 'true';
            zoom.setAttribute('aria-pressed', 'true');
            zoomLabel.textContent = zoom.dataset.zoomOut;
          }
        }
      });

      stage.addEventListener('pointerdown', event => {
        if (stage.dataset.zoomed !== 'true') return;
        event.preventDefault();
        stage.setPointerCapture(event.pointerId);
        drag = {id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY};
        stage.dataset.dragging = 'true';
      });
      stage.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const maxX = stage.clientWidth * 0.23;
        const maxY = stage.clientHeight * 0.23;
        panX = Math.max(-maxX, Math.min(maxX, drag.panX + event.clientX - drag.x));
        panY = Math.max(-maxY, Math.min(maxY, drag.panY + event.clientY - drag.y));
        stage.style.setProperty('--eva-pan-x', `${panX}px`);
        stage.style.setProperty('--eva-pan-y', `${panY}px`);
      });
      const endDrag = event => {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        stage.dataset.dragging = 'false';
      };
      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);

      dialog.addEventListener('close', resetZoom);
      document.addEventListener('change', event => {
        if (event.target.matches('.product-form__input[data-name="mats_type"] input')) syncType();
      });
      document.addEventListener('evamats:config-step-updated', syncType);
      dialog.addEventListener('toggle', () => { if (dialog.open) syncType(); });
      syncType();
    });
  }

  document.addEventListener('shopify:section:load', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
