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
  // Google photo URLs carry the crop in the suffix; the card uses a 600×450 crop, the viewer the full frame.
  const fullPhoto = url => String(url || '').replace(/=w\d+-h\d+[^/?#]*$/, '=w1600-h1600-k-no');
  const icon = path => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

  const buildReviewCard = (root, review) => {
    const card = document.createElement('article');
    card.className = 'cz-cro-review-card';
    card.setAttribute('aria-label', review.author);
    card.dataset.czCroPhotoReview = '';
    card.dataset.reviewId = review.id || '';
    if (root.dataset.reviewSourceUrl) card.dataset.sourceUrl = root.dataset.reviewSourceUrl;

    if (review.photo_url) {
      const media = document.createElement('div');
      media.className = 'cz-cro-review-media';
      media.dataset.czCroPhoto = review.id || '';
      media.setAttribute('role', 'button');
      media.tabIndex = 0;
      media.setAttribute('aria-label', `${root.dataset.reviewPhotoOpen || ''} – ${review.author}`);
      const photo = document.createElement('img');
      photo.className = 'cz-cro-review-photo';
      photo.dataset.src = review.photo_url;
      photo.width = 600;
      photo.height = 450;
      photo.loading = 'lazy';
      photo.decoding = 'async';
      photo.referrerPolicy = 'no-referrer';
      photo.draggable = false;
      photo.alt = `${root.dataset.reviewPhotoAlt || ''} ${review.author}`.trim();
      const zoom = document.createElement('span');
      zoom.className = 'cz-cro-review-zoom';
      zoom.innerHTML = icon('M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.8-4.8M10.5 7.5v6M7.5 10.5h6');
      media.append(photo, zoom);
      card.append(media);
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

  // Photo viewer: one modal per page, fed by the review list in its original (stable) order.
  let viewer;
  const getViewer = root => {
    if (viewer) return viewer;
    const dialog = document.createElement('dialog');
    dialog.className = 'cz-cro-lightbox';
    dialog.innerHTML = `<figure class="cz-cro-lightbox__figure"><img class="cz-cro-lightbox__img" alt="" decoding="async" referrerpolicy="no-referrer" draggable="false"><figcaption class="cz-cro-lightbox__caption"><span class="cz-cro-lightbox__who"><strong data-lb-author></strong><span class="cz-cro-stars" aria-hidden="true">★★★★★</span></span><p data-lb-text></p></figcaption></figure><div class="cz-cro-lightbox__bar"><button type="button" data-lb-prev>${icon('M15 5l-7 7 7 7')}</button><button type="button" data-lb-next>${icon('M9 5l7 7-7 7')}</button></div><button type="button" class="cz-cro-lightbox__close" data-lb-close>${icon('M6 6l12 12M18 6 6 18')}</button>`;
    dialog.querySelector('[data-lb-prev]').setAttribute('aria-label', root.dataset.reviewPrevious || '');
    dialog.querySelector('[data-lb-next]').setAttribute('aria-label', root.dataset.reviewNext || '');
    dialog.querySelector('[data-lb-close]').setAttribute('aria-label', root.dataset.reviewClose || '');
    document.body.append(dialog);
    const image = dialog.querySelector('img');
    const state = { items: [], index: 0, root, returnTo: null };
    const show = index => {
      const count = state.items.length;
      if (!count) return;
      state.index = (index + count) % count;
      const item = state.items[state.index];
      image.src = fullPhoto(item.photo_url);
      image.alt = `${state.root.dataset.reviewPhotoAlt || ''} ${item.author}`.trim();
      dialog.querySelector('[data-lb-author]').textContent = item.author;
      const words = String(item.text || '').trim().split(/\s+/);
      dialog.querySelector('[data-lb-text]').textContent = words.length > 40 ? `${words.slice(0, 40).join(' ')}…` : item.text || '';
      [1, -1].forEach(step => { const next = state.items[(state.index + step + count) % count]; if (next) new Image().src = fullPhoto(next.photo_url); });
    };
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-lb-prev]')) show(state.index - 1);
      else if (event.target.closest('[data-lb-next]')) show(state.index + 1);
      else if (event.target.closest('[data-lb-close]')) dialog.close();
    });
    let downOnBackdrop = false;
    let swipeX = null;
    dialog.addEventListener('pointerdown', event => {
      downOnBackdrop = event.target === dialog;
      swipeX = event.target.closest('.cz-cro-lightbox__figure') ? event.clientX : null;
    });
    dialog.addEventListener('pointerup', event => {
      if (downOnBackdrop && event.target === dialog) dialog.close();
      if (swipeX !== null && Math.abs(event.clientX - swipeX) > 50) show(state.index + (event.clientX < swipeX ? 1 : -1));
      downOnBackdrop = false;
      swipeX = null;
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        show(state.index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('cz-cro-dialog-open');
      if (state.returnTo?.isConnected) state.returnTo.focus({ preventScroll: true });
    });
    viewer = { dialog, state, show };
    return viewer;
  };
  const openPhoto = (root, media) => {
    const items = (root.__czCroReviews || []).filter(item => item.photo_url);
    const index = items.findIndex(item => (item.id || '') === media.dataset.czCroPhoto);
    if (index < 0) return;
    const { dialog, state, show } = getViewer(root);
    Object.assign(state, { items, root, returnTo: media });
    show(index);
    if (!dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('cz-cro-dialog-open');
    }
  };

  const initReviewCarousel = root => {
    const viewport = root.querySelector('.cz-cro-review-viewport');
    const track = root.querySelector('.cz-cro-review-grid');
    const controls = root.querySelector('[data-cz-cro-controls]');
    if (!viewport || !track || !controls || root.dataset.fullPage === 'true') return;
    root.dataset.carousel = 'true';
    controls.hidden = false;
    let moving = false;
    let pointerId;
    let dragStart = 0;
    let dragOffset = 0;
    let downTarget = null;
    // Cards outside the window are inert, so Tab never lands in a clipped card and never scrolls the viewport.
    const syncInert = () => {
      const box = viewport.getBoundingClientRect();
      [...track.children].forEach(card => {
        const rect = card.getBoundingClientRect();
        card.inert = rect.right <= box.left + 1 || rect.left >= box.right - 1;
      });
    };
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
      syncInert();
    };
    const move = direction => {
      if (moving || track.children.length < 2) return;
      moving = true;
      track.querySelectorAll('.cz-cro-review-card').forEach(card => { card.inert = false; });
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
    controls.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    viewport.addEventListener('scroll', () => { if (viewport.scrollLeft) viewport.scrollLeft = 0; });
    viewport.addEventListener('pointerdown', event => {
      if (moving || event.button > 0 || event.target.closest('button,summary,a,input,select')) return;
      pointerId = event.pointerId;
      downTarget = event.target;
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
      // Pointer capture retargets the click to the viewport, so a tap on a photo is recognised here.
      const tapped = event.type === 'pointerup' && Math.abs(dragOffset) < 6 ? downTarget?.closest('[data-cz-cro-photo]') : null;
      if (Math.abs(dragOffset) >= Math.min(70, viewport.clientWidth * .14)) move(dragOffset < 0 ? 1 : -1);
      dragOffset = 0;
      downTarget = null;
      if (tapped) setTimeout(() => openPhoto(root, tapped), 0);
    };
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (!moving) syncInert(); }).observe(viewport);
    syncInert();
  };
  const initReviews = () => {
    document.querySelectorAll('[data-cz-cro-reviews]').forEach(async root => {
      if (root.dataset.croReady) return;
      root.dataset.croReady = 'loading';
      const grid = root.querySelector('.cz-cro-review-grid');
      const status = root.querySelector('[data-review-feed-status]');
      root.addEventListener('click', event => {
        const media = event.target.closest('[data-cz-cro-photo]');
        if (media && root.dataset.carousel !== 'true') openPhoto(root, media);
      });
      root.addEventListener('keydown', event => {
        const media = event.target.closest('[data-cz-cro-photo]');
        if (!media || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        openPhoto(root, media);
      });
      try {
        const response = await fetch(root.dataset.reviewFeedUrl, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Review feed ${response.status}`);
        const reviews = await response.json();
        grid.replaceChildren(...reviews.map(review => buildReviewCard(root, review)));
        const cards = mixPhotoReviews([...grid.children]);
        cards.forEach(card => grid.append(card));
        const byId = new Map(reviews.map(review => [review.id || '', review]));
        root.__czCroReviews = cards.map(card => byId.get(card.dataset.reviewId)).filter(Boolean);
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
      const counter = root.querySelector('[data-cz-cro-mini-count]');
      let index = 0;
      const show = next => {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
        if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
      };
      root.addEventListener('click', event => {
        const button = event.target.closest('[data-cz-cro-mini-step]');
        if (button && slides.length) show(index + Number(button.dataset.czCroMiniStep));
      });
      show(0);
    });
  };
  // Content above the reviews (lazy images, late sections) keeps growing while a smooth scroll runs,
  // so a single scrollIntoView lands short. Re-align until the section holds still, and stop as soon
  // as the visitor takes over the scroll.
  let scrollJob;
  const scrollToReviews = target => {
    scrollJob?.abort();
    const job = new AbortController();
    scrollJob = job;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type => window.addEventListener(type, () => job.abort(), { passive: true, capture: true, signal: job.signal }));
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    const margin = () => parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const started = performance.now();
    let lastY = scrollY;
    let still = 0;
    let aligned = 0;
    let retries = 0;
    target.scrollIntoView({ behavior, block: 'start' });
    const check = () => {
      if (job.signal.aborted) return;
      const offset = target.getBoundingClientRect().top - margin();
      const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      still = Math.abs(scrollY - lastY) > 1 ? 0 : still + 1;
      lastY = scrollY;
      aligned = Math.abs(offset) <= 3 || (atBottom && offset > 0) ? aligned + 1 : 0;
      if (aligned >= 4 || performance.now() - started > 6000) { job.abort(); return; }
      if (still >= 2 && !aligned && retries < 8) {
        retries += 1;
        still = 0;
        target.scrollIntoView({ behavior, block: 'start' });
      }
      setTimeout(check, 120);
    };
    setTimeout(check, 120);
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
      scrollToReviews(reviews);
    }
  });
  document.addEventListener('shopify:section:unload', unlock);
  const init = () => { initReviews(); initMiniReviews(); };
  document.addEventListener('shopify:section:load', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
