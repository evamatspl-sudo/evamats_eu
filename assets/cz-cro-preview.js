(() => {
  'use strict';
  if (window.__czCroPreviewReady) return;
  window.__czCroPreviewReady = true;
  let opener;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const randomIndex = max => {
    if (max <= 1) return 0;
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % max;
    }
    return Math.floor(Math.random() * max);
  };
  const shuffle = items => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapWith = randomIndex(index + 1);
      [items[index], items[swapWith]] = [items[swapWith], items[index]];
    }
    return items;
  };
  const mixPhotoReviews = cards => {
    const photoCards = shuffle(cards.filter(card => card.hasAttribute('data-cz-cro-photo-review')));
    const textCards = shuffle(cards.filter(card => !card.hasAttribute('data-cz-cro-photo-review')));
    if (!photoCards.length) return textCards;
    const mixed = [];
    while (photoCards.length) {
      mixed.push(photoCards.shift());
      const batchSize = Math.ceil(textCards.length / Math.max(photoCards.length + 1, 1));
      mixed.push(...textCards.splice(0, batchSize));
    }
    mixed.push(...textCards);
    return mixed;
  };
  const buildReviewCard = (root, review) => {
    const card = document.createElement('article');
    card.className = 'cz-cro-review-card';
    card.setAttribute('aria-label', review.author);
    card.dataset.czCroPhotoReview = '';
    card.dataset.reviewId = review.id || '';
    if (root.dataset.reviewSourceUrl) card.dataset.sourceUrl = root.dataset.reviewSourceUrl;

    if (review.photo_url) {
      const photo = document.createElement('img');
      photo.className = 'cz-cro-review-photo';
      photo.dataset.src = review.photo_url;
      photo.width = 600;
      photo.height = 450;
      photo.loading = 'lazy';
      photo.decoding = 'async';
      photo.referrerPolicy = 'no-referrer';
      photo.alt = `${root.dataset.reviewPhotoAlt || ''} ${review.author}`.trim();
      card.append(photo);
    }

    const content = document.createElement('div');
    content.className = 'cz-cro-review-content';
    const byline = document.createElement('div');
    byline.className = 'cz-cro-review-byline';
    const author = document.createElement('div');
    author.className = 'cz-cro-review-author';
    const authorCopy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = review.author;
    const stars = document.createElement('span');
    stars.className = 'cz-cro-stars';
    stars.setAttribute('aria-label', root.dataset.reviewRating);
    stars.textContent = '★★★★★';
    authorCopy.append(name, stars);
    author.append(authorCopy);
    byline.append(author);

    const quote = document.createElement('blockquote');
    const words = String(review.text || '').trim().split(/\s+/);
    if (words.length > 38) {
      const excerpt = document.createElement('p');
      excerpt.className = 'cz-cro-review-excerpt';
      excerpt.textContent = `${words.slice(0, 38).join(' ')}…`;
      const details = document.createElement('details');
      details.className = 'cz-cro-review-details';
      const summary = document.createElement('summary');
      const more = document.createElement('span');
      more.className = 'cz-cro-read-more';
      more.textContent = root.dataset.reviewReadMore;
      const less = document.createElement('span');
      less.className = 'cz-cro-read-less';
      less.textContent = root.dataset.reviewReadLess;
      summary.append(more, less);
      const full = document.createElement('p');
      full.textContent = review.text;
      details.append(summary, full);
      quote.append(excerpt, details);
    } else {
      const paragraph = document.createElement('p');
      paragraph.textContent = review.text;
      quote.append(paragraph);
    }
    const source = document.createElement('p');
    source.className = 'cz-cro-review-source';
    source.textContent = root.dataset.reviewSource;
    content.append(byline, quote, source);
    card.append(content);
    return card;
  };
  const initReviewImages = root => {
    const images = [...root.querySelectorAll('img[data-src]')];
    const load = image => {
      if (!image.dataset.src) return;
      image.src = image.dataset.src;
      delete image.dataset.src;
    };
    if (!('IntersectionObserver' in window)) {
      images.forEach(load);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '480px' });
    images.forEach(image => observer.observe(image));
  };
  const initReviewCarousel = root => {
    const viewport = root.querySelector('.cz-cro-review-viewport');
    const track = root.querySelector('.cz-cro-review-grid');
    const controls = root.querySelector('[data-cz-cro-controls]');
    if (!viewport || !track || !controls || root.dataset.fullPage === 'true') return;
    controls.hidden = false;
    let moving = false;
    let pointerId;
    let dragStart = 0;
    let dragOffset = 0;
    const step = () => {
      const first = track.firstElementChild;
      if (!first) return 0;
      return first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    };
    const reset = () => {
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,0,0)';
      track.offsetWidth;
      track.style.transition = '';
      moving = false;
    };
    const move = direction => {
      if (moving || track.children.length < 2) return;
      moving = true;
      if (direction > 0) {
        const finish = () => {
          track.removeEventListener('transitionend', finish);
          track.append(track.firstElementChild);
          reset();
        };
        if (reducedMotion()) { finish(); return; }
        track.addEventListener('transitionend', finish);
        track.style.transition = 'transform 260ms var(--cro-ease-out)';
        track.style.transform = `translate3d(${-step()}px,0,0)`;
      } else {
        track.prepend(track.lastElementChild);
        track.style.transition = 'none';
        track.style.transform = `translate3d(${-step()}px,0,0)`;
        track.offsetWidth;
        const finish = () => {
          track.removeEventListener('transitionend', finish);
          reset();
        };
        if (reducedMotion()) { reset(); return; }
        track.addEventListener('transitionend', finish);
        track.style.transition = 'transform 260ms var(--cro-ease-out)';
        track.style.transform = 'translate3d(0,0,0)';
      }
    };
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-cz-cro-slide]');
      if (button) move(Number(button.dataset.czCroSlide));
    });
    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    viewport.addEventListener('pointerdown', event => {
      if (moving || event.target.closest('button,summary,a,input,select')) return;
      pointerId = event.pointerId;
      dragStart = event.clientX;
      dragOffset = 0;
      viewport.setPointerCapture(pointerId);
      track.style.transition = 'none';
      viewport.dataset.dragging = 'true';
    });
    viewport.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId) return;
      dragOffset = event.clientX - dragStart;
      track.style.transform = `translate3d(${dragOffset}px,0,0)`;
    });
    const release = event => {
      if (event.pointerId !== pointerId) return;
      if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
      pointerId = undefined;
      delete viewport.dataset.dragging;
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,0,0)';
      track.offsetWidth;
      track.style.transition = '';
      if (Math.abs(dragOffset) >= Math.min(70, viewport.clientWidth * .14)) move(dragOffset < 0 ? 1 : -1);
      dragOffset = 0;
    };
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
  };
  const initReviews = () => {
    document.querySelectorAll('[data-cz-cro-reviews]').forEach(async root => {
      if (root.dataset.croReady) return;
      root.dataset.croReady = 'loading';
      const grid = root.querySelector('.cz-cro-review-grid');
      const status = root.querySelector('[data-review-feed-status]');
      try {
        const response = await fetch(root.dataset.reviewFeedUrl, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Review feed ${response.status}`);
        const reviews = await response.json();
        grid.replaceChildren(...reviews.map(review => buildReviewCard(root, review)));
        const cards = mixPhotoReviews([...grid.children]);
        cards.forEach(card => grid.append(card));
        initReviewImages(root);
        status.hidden = true;
      } catch (error) {
        status.textContent = root.dataset.reviewFeedError || '';
        if (!status.textContent) status.hidden = true;
      }
      root.dataset.croReady = 'true';
      initReviewCarousel(root);
    });
  };
  const initMiniReviews = () => {
    document.querySelectorAll('[data-cz-cro-mini-reviews]').forEach(root => {
      if (root.dataset.croMiniReady) return;
      root.dataset.croMiniReady = 'true';
      const slides = [...root.querySelectorAll('[data-cz-cro-mini-slide]')];
      shuffle(slides).forEach(slide => slide.parentElement.append(slide));
      let index = 0;
      const show = next => {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
      };
      root.addEventListener('click', event => {
        const button = event.target.closest('[data-cz-cro-mini-step]');
        if (button && slides.length) show(index + Number(button.dataset.czCroMiniStep));
      });
      show(0);
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
  const init = () => { initReviews(); initMiniReviews(); };
  document.addEventListener('shopify:section:load', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
