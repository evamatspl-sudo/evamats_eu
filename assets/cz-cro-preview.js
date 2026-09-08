(() => {
  'use strict';
  if (window.__czCroPreviewReady) return;
  window.__czCroPreviewReady = true;
  let opener;
  const initReviews = () => {
    document.querySelectorAll('[data-cz-cro-controls]').forEach(controls => {
      const grid = document.getElementById(controls.querySelector('button').getAttribute('aria-controls'));
      if (!grid || grid.dataset.croReady) return;
      grid.dataset.croReady = 'true';
      controls.hidden = false;
      const buttons = controls.querySelectorAll('button');
      const position = controls.querySelector('[data-cz-cro-position]');
      const update = () => {
        const cards = Array.from(grid.children);
        const bounds = grid.getBoundingClientRect();
        // Count cards at least half visible, not the clipped teaser of the next card.
        const visible = cards.map((card, index) => {
          const rect = card.getBoundingClientRect();
          const overlap = Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left);
          return overlap >= rect.width / 2 ? index + 1 : null;
        }).filter(index => index !== null);
        const first = visible[0] || 1;
        const last = visible[visible.length - 1] || first;
        const label = (first === last ? first : first + '–' + last) + ' / ' + cards.length;
        if (position.textContent !== label) position.textContent = label;
        buttons[0].disabled = grid.scrollLeft <= 5;
        buttons[1].disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
      };
      controls.addEventListener('click', event => {
        const button = event.target.closest('[data-cz-cro-slide]');
        if (!button || button.disabled) return;
        const step = grid.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap);
        grid.scrollBy({ left: Number(button.dataset.czCroSlide) * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      grid.addEventListener('scroll', update, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(update).observe(grid);
      update();
    });
  };
  const unlock = () => document.documentElement.classList.remove('cz-cro-dialog-open');
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-cz-cro-open]');
    if (open) {
      const dialog = document.getElementById(open.getAttribute('aria-controls'));
      if (!dialog || dialog.open) return;
      opener = open;
      dialog.addEventListener('close', () => { unlock(); if (opener?.isConnected) opener.focus(); }, { once: true });
      dialog.showModal();
      document.documentElement.classList.add('cz-cro-dialog-open');
      return;
    }
    const close = event.target.closest('[data-cz-cro-close]');
    if (close) { close.closest('dialog')?.close(); return; }
    if (event.target.matches('dialog.cz-cro-dialog')) {
      const bounds = event.target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
    }
    const reviewLink = event.target.closest('a[href="#cz-cro-reviews"]');
    const reviews = document.getElementById('cz-cro-reviews');
    if (reviewLink && reviews) {
      event.preventDefault();
      reviews.focus({ preventScroll: true });
      reviews.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  });
  document.addEventListener('shopify:section:unload', unlock);
  document.addEventListener('shopify:section:load', initReviews);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initReviews, { once: true });
  else initReviews();
})();
