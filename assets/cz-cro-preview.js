(() => {
  'use strict';
  if (window.__czCroPreviewReady) return;
  window.__czCroPreviewReady = true;
  let opener;
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
})();
