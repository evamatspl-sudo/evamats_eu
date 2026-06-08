(function () {
  function initPopularModels(root) {
    const track = root.querySelector('.evamats-popular-models__track');
    const prev = root.querySelector('.evamats-popular-models__nav--prev');
    const next = root.querySelector('.evamats-popular-models__nav--next');
    const fadeLeft = root.querySelector('.evamats-popular-models__fade--left');
    const fadeRight = root.querySelector('.evamats-popular-models__fade--right');
    const footer = root.querySelector('.evamats-popular-models__footer');
    const prevFooter = root.querySelector('.evamats-popular-models__nav--footer-prev');
    const nextFooter = root.querySelector('.evamats-popular-models__nav--footer-next');
    const scrollbarThumb = root.querySelector('.evamats-popular-models__scrollbar-thumb');

    if (!track) return;

    function scrollStep() {
      const group = track.querySelector('.evamats-popular-models__group');
      if (!group) return track.clientWidth * 0.8;

      const styles = getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const divider = track.querySelector('.evamats-popular-models__divider');
      let step = group.offsetWidth + gap;
      if (divider) step += divider.offsetWidth + gap;
      return step;
    }

    function updateScrollbar() {
      if (!scrollbarThumb) return;

      const { scrollWidth, clientWidth, scrollLeft } = track;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);

      if (maxScroll <= 0) {
        scrollbarThumb.style.width = '100%';
        scrollbarThumb.style.left = '0';
        return;
      }

      const thumbWidth = (clientWidth / scrollWidth) * 100;
      const maxLeft = 100 - thumbWidth;
      const left = (scrollLeft / maxScroll) * maxLeft;

      scrollbarThumb.style.width = `${thumbWidth}%`;
      scrollbarThumb.style.left = `${left}%`;
    }

    function update() {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const left = track.scrollLeft;
      const canScroll = maxScroll > 1;

      root.classList.toggle('evamats-popular-models__stage--scrollable', canScroll);

      if (prev) prev.disabled = !canScroll || left <= 1;
      if (next) next.disabled = !canScroll || left >= maxScroll - 1;

      if (fadeLeft) fadeLeft.hidden = !canScroll || left <= 1;
      if (fadeRight) fadeRight.hidden = !canScroll || left >= maxScroll - 1;

      if (footer) footer.hidden = !canScroll;

      if (prevFooter) prevFooter.disabled = !canScroll || left <= 1;
      if (nextFooter) nextFooter.disabled = !canScroll || left >= maxScroll - 1;

      updateScrollbar();
    }

    function scrollBy(direction) {
      track.scrollBy({ left: direction * scrollStep(), behavior: 'smooth' });
    }

    prev?.addEventListener('click', () => scrollBy(-1));
    next?.addEventListener('click', () => scrollBy(1));
    prevFooter?.addEventListener('click', () => scrollBy(-1));
    nextFooter?.addEventListener('click', () => scrollBy(1));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(track);
    }

    update();
  }

  function initAll() {
    document.querySelectorAll('[data-evamats-popular-models]').forEach(initPopularModels);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-evamats-popular-models]').forEach(initPopularModels);
  });
})();
