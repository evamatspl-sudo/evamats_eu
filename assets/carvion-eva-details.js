(() => {
  'use strict';
  if (window.__carvionEvaDetails) return;
  window.__carvionEvaDetails = true;

  const HOVER_SCALE = 2.2;
  const selectedMatType = () => {
    const checked = document.querySelector('.product-form__input[data-name="mats_type"] input:checked');
    return checked?.dataset.name === '3d' ? '3d' : 'classic';
  };
  const canHoverZoom = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      let hover = {x: 50, y: 50, scale: 1};

      const activePhoto = () => photos.find(frame => frame.dataset.evaPhoto === type)?.querySelector('img');
      const activePins = () => stage.querySelector(`[data-eva-pins="${type}"]`);
      const activeGroup = () => dialog.querySelector(`[data-eva-group="${type}"]`);
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
      // A zoomed photo needs more pixels than the small layout slot asks the browser for.
      const requestSharpPhoto = () => {
        const photo = activePhoto();
        if (!photo || photo.dataset.evaSharp) return;
        photo.dataset.evaSharp = 'true';
        photo.sizes = '(min-width: 750px) 1400px, 200vw';
      };
      // Pins live outside the scaled photo so they keep their size. Their position is projected
      // through the same zoom (x' = origin + (x - origin) * scale); pins pushed off the photo hide.
      const projectPins = () => {
        stage.style.setProperty('--zx', hover.x);
        stage.style.setProperty('--zy', hover.y);
        stage.style.setProperty('--zs', hover.scale);
        activePins()?.querySelectorAll('.carvion-eva-pin').forEach(pin => {
          const x = hover.x + (parseFloat(pin.style.getPropertyValue('--px')) - hover.x) * hover.scale;
          const y = hover.y + (parseFloat(pin.style.getPropertyValue('--py')) - hover.y) * hover.scale;
          pin.toggleAttribute('data-off', x < 4 || x > 96 || y < 3 || y > 97);
        });
      };
      const setHoverZoom = (active, x = hover.x, y = hover.y) => {
        hover = {x, y, scale: active ? HOVER_SCALE : 1};
        stage.dataset.hoverZoom = String(active);
        projectPins();
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
        setHoverZoom(false, 50, 50);
      };
      const showFeature = key => {
        [activeGroup(), activePins()].forEach(scope => scope?.querySelectorAll('[data-eva-feature]').forEach(button => {
          button.setAttribute('aria-pressed', String(button.dataset.evaFeature === key));
        }));
        activeGroup()?.querySelectorAll('[data-eva-panel]').forEach(panel => { panel.hidden = panel.dataset.evaPanel !== key; });
      };
      const syncType = () => {
        type = selectedMatType();
        stage.dataset.matType = type;
        resetZoom();
        photos.forEach(frame => { frame.hidden = frame.dataset.evaPhoto !== type; });
        stage.querySelectorAll('[data-eva-pins]').forEach(pins => { pins.hidden = pins.dataset.evaPins !== type; });
        dialog.querySelectorAll('[data-eva-group]').forEach(group => { group.hidden = group.dataset.evaGroup !== type; });
        const first = activeGroup()?.querySelector('[data-eva-feature]')?.dataset.evaFeature;
        if (first) showFeature(first);
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
        if (feature && dialog.contains(feature)) {
          showFeature(feature.dataset.evaFeature);
          // On phones the explanation sits below the photo: bring it into view after a pin tap.
          if (feature.classList.contains('carvion-eva-pin') && matchMedia('(max-width: 749px)').matches) {
            activeGroup()?.querySelector('.carvion-eva-explanation')?.scrollIntoView({block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth'});
          }
        }
        if (event.target.closest('[data-eva-zoom]') && !zoom.disabled) {
          if (zoom.getAttribute('aria-pressed') === 'true') resetZoom();
          else {
            setHoverZoom(false, 50, 50);
            requestSharpPhoto();
            stage.dataset.zoomed = 'true';
            zoom.setAttribute('aria-pressed', 'true');
            zoomLabel.textContent = zoom.dataset.zoomOut;
          }
        }
      });

      stage.addEventListener('pointerdown', event => {
        if (stage.dataset.zoomed !== 'true' || event.target.closest('.carvion-eva-pin')) return;
        event.preventDefault();
        stage.setPointerCapture(event.pointerId);
        drag = {id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY};
        stage.dataset.dragging = 'true';
      });
      stage.addEventListener('pointermove', event => {
        if (drag && drag.id === event.pointerId) {
          const maxX = stage.clientWidth * 0.23;
          const maxY = stage.clientHeight * 0.23;
          panX = Math.max(-maxX, Math.min(maxX, drag.panX + event.clientX - drag.x));
          panY = Math.max(-maxY, Math.min(maxY, drag.panY + event.clientY - drag.y));
          stage.style.setProperty('--eva-pan-x', `${panX}px`);
          stage.style.setProperty('--eva-pan-y', `${panY}px`);
          return;
        }
        // Desktop magnifier: the photo scales around the cursor. Over a pin the origin is frozen,
        // so the number stays still under the pointer and can be clicked.
        if (event.pointerType !== 'mouse' || !canHoverZoom() || stage.dataset.zoomed === 'true' || stage.dataset.state !== 'success') return;
        if (event.target.closest('.carvion-eva-pin')) return;
        const box = stage.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100));
        const y = Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100));
        requestSharpPhoto();
        setHoverZoom(true, x, y);
      });
      stage.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse' && stage.dataset.zoomed !== 'true') setHoverZoom(false);
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
