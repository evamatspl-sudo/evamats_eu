document.addEventListener('DOMContentLoaded', function () {
  const galleryContainer = document.querySelector('.gallery__container');
  const message = document.querySelector('.gallery__message');
  const resetButton = document.querySelector('.gallery__reset');
  const edgeTabs = document.querySelectorAll('.gallery__tabs_edges .gallery__tabs_item');
  const images = document.querySelectorAll('.gallery__container .gallery__image');

  let selectedType = '';
  let selectedEdge = '';
  let lastValidEdge = 'withEdges';

  const bodyTypeMapping = {
    Coupe: ['2os'],
    Roadster: ['2os'],
    Convertible: ['2os', '5os'],
    Sedan: ['5os'],
    Hatchback: ['5os'],
    'Station Wagon': ['5os', '7os'],
    SUV: ['7os'],
    Bus: ['bus'],
    TIR: ['tir'],
    VAN: ['van_big', 'van_small'],
    Camper: ['van_big'],
    Tractor: ['tractors'],
    Pickup: ['pickup'],
    Minivan: ['minivan'],
  };

  const noEdgeTypes = ['Bus', 'TIR', 'Camper', 'Tractor', 'Minivan'];

  const typeSelect = document.querySelector('.gallery__tabs_types.eva__tabs');
  if (typeSelect) {
    let selectHeader = typeSelect.querySelector('.select-header');
    if (!selectHeader) {
      selectHeader = document.createElement('div');
      selectHeader.classList.add('select-header');
      selectHeader.textContent = selectHeader.dataset.text;
      typeSelect.insertBefore(selectHeader, typeSelect.firstChild);
      const optionsContainer = document.createElement('div');
      optionsContainer.classList.add('select-options');
      const options = typeSelect.querySelectorAll('.eva__tabs_item.gallery__tabs_item');
      options.forEach((opt) => {
        optionsContainer.appendChild(opt);
      });
      typeSelect.appendChild(optionsContainer);
    }

    selectHeader.addEventListener('click', function (e) {
      e.stopPropagation();
      typeSelect.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!typeSelect.contains(e.target)) {
        typeSelect.classList.remove('open');
      }
    });

    const typeOptions = typeSelect.querySelectorAll('.select-options .eva__tabs_item.gallery__tabs_item');
    typeOptions.forEach((option) => {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        selectedType = this.dataset.type;
        selectHeader.textContent = this.textContent.trim();
        typeOptions.forEach((opt) => opt.classList.remove('active'));
        this.classList.add('active');
        typeSelect.classList.remove('open');
        if (!noEdgeTypes.includes(selectedType)) {
          selectedEdge = lastValidEdge;
        } else {
          selectedEdge = '';
        }
        filterImages();
      });
    });
  }

  edgeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('disabled')) return;
      selectedEdge = tab.dataset.type;
      lastValidEdge = selectedEdge;
      edgeTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      filterImages();
    });
  });

  function reorderGallery(relevantWrappers, nonRelevantWrappers) {
    galleryContainer.innerHTML = '';
    relevantWrappers.forEach((wrapper) => {
      galleryContainer.appendChild(wrapper);
    });
    if (nonRelevantWrappers.length > 0) {
      const divider = document.createElement('div');
      const dividerText = document.querySelector('.gallery__divider_text').textContent;
      divider.className = 'gallery__divider';
      divider.style.width = '100%';
      divider.style.textAlign = 'center';
      divider.style.padding = '10px 0';
      divider.textContent = dividerText;
      galleryContainer.appendChild(divider);
      nonRelevantWrappers.forEach((wrapper) => {
        galleryContainer.appendChild(wrapper);
      });
    }
    updateGalleryMobileLayout();
  }

  function updateGalleryMobileLayout() {
    if (!galleryContainer) return;

    galleryContainer.querySelectorAll('.gallery__image_wr').forEach(function (wrapper, index) {
      wrapper.classList.toggle('gallery__image_wr--full', (index + 1) % 5 === 0);
    });
  }

  function filterImages() {
    let relevantWrappers = [];
    let nonRelevantWrappers = [];
    let hasRelevant = false;

    if (selectedType) {
      if (noEdgeTypes.includes(selectedType)) {
        lastValidEdge = selectedEdge || lastValidEdge;
        selectedEdge = '';
        edgeTabs.forEach((tab) => tab.classList.add('disabled'));
      } else {
        edgeTabs.forEach((tab) => tab.classList.remove('disabled'));
        if (!selectedEdge) {
          selectedEdge = lastValidEdge;
        }
      }
    } else {
      edgeTabs.forEach((tab) => tab.classList.remove('disabled'));
    }

    edgeTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.type === selectedEdge);
    });

    images.forEach((image) => {
      const wrapper = image.closest('.gallery__image_wr');
      const dataType = image.dataset.type;
      let matchesType = selectedType
        ? (bodyTypeMapping[selectedType] || []).some((subType) => dataType.includes(subType))
        : true;
      let matchesEdge = true;
      if (selectedEdge) {
        if (selectedEdge === 'withoutEdges') {
          matchesEdge = !dataType.includes('_edges');
        } else if (selectedEdge === 'withEdges') {
          matchesEdge = dataType.includes('_edges');
        }
      }
      if (matchesType && matchesEdge) {
        relevantWrappers.push(wrapper);
        hasRelevant = true;
      } else {
        nonRelevantWrappers.push(wrapper);
      }
    });

    message.classList.toggle('hidden', hasRelevant);
    reorderGallery(relevantWrappers, nonRelevantWrappers);
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      selectedType = '';
      selectedEdge = '';
      lastValidEdge = 'withEdges';

      if (typeSelect) {
        const selectHeader = typeSelect.querySelector('.select-header');
        selectHeader.textContent = selectHeader.dataset.text;
        typeSelect.classList.remove('open');
        const typeOptions = typeSelect.querySelectorAll('.select-options .eva__tabs_item.gallery__tabs_item');
        typeOptions.forEach((opt) => opt.classList.remove('active'));
      }
      edgeTabs.forEach((t) => t.classList.remove('active', 'disabled'));
      filterImages();
    });
  }

  filterImages();
  bindGalleryFancyboxOnClick();
});

function bindGalleryFancyboxOnClick() {
  if (window.__evamatsGalleryFancyboxClickBound) return;
  window.__evamatsGalleryFancyboxClickBound = true;
  var opening = false;

  document.addEventListener(
    'click',
    function (event) {
      var link = event.target.closest('a[data-fancybox="gallery"]');
      if (!link || !document.querySelector('.gallery')) return;
      if (window.__evamatsGalleryFancyboxReady) return;
      if (opening) return;

      event.preventDefault();
      event.stopPropagation();
      opening = true;

      var loader =
        typeof window.ensureFancyboxLoaded === 'function'
          ? window.ensureFancyboxLoaded()
          : Promise.reject(new Error('ensureFancyboxLoaded missing'));

      loader
        .then(function () {
          initGalleryFancybox();
          window.__evamatsGalleryFancyboxReady = true;
          opening = false;
          link.click();
        })
        .catch(function (err) {
          opening = false;
          console.error(err);
          window.location.href = link.href;
        });
    },
    true
  );
}

function getGalleryFancyboxInstance(ref) {
  if (ref && typeof ref.getSlide === 'function') return ref;
  if (typeof Fancybox !== 'undefined' && typeof Fancybox.getInstance === 'function') {
    return Fancybox.getInstance();
  }
  return ref;
}

function getGalleryFancyboxCarousel(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  if (!instance) return null;
  if (typeof instance.getCarousel === 'function') return instance.getCarousel();
  return instance.carousel || null;
}

function getGalleryFancyboxSlides(fancybox) {
  const carousel = getGalleryFancyboxCarousel(fancybox);
  if (carousel && Array.isArray(carousel.slides) && carousel.slides.length) {
    return carousel.slides;
  }

  return Array.from(document.querySelectorAll('[data-fancybox="gallery"]')).map(function (triggerEl, index) {
    return {
      triggerEl: triggerEl,
      index: index,
      src: triggerEl.getAttribute('href'),
      thumb: triggerEl.dataset.thumb,
    };
  });
}

function getGalleryFancyboxSlideIndex(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  if (!instance) return 0;

  const slide = typeof instance.getSlide === 'function' ? instance.getSlide() : null;
  if (slide && typeof slide.index === 'number') return slide.index;

  const carousel = getGalleryFancyboxCarousel(instance);
  if (carousel && typeof carousel.page === 'number') return carousel.page;

  return 0;
}

const GALLERY_FANCYBOX_CLOSE_HTML =
  '<button data-fancybox-close class="gallery-fancybox__close" type="button" aria-label="Close">' +
  '<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<circle cx="25" cy="25" r="25" fill="#1B1D22"/>' +
  '<path d="M30 28L28 30L25 27L22 30L20 28L23 25L20 22L22 20L25 23L28 20L30 22L27 25L30 28Z" fill="white"/>' +
  '</svg></button>';

function initGalleryFancybox() {
  const panelTemplate = document.getElementById('gallery-fancybox-panels');
  if (typeof Fancybox === 'undefined') return;

  Fancybox.bind('[data-fancybox="gallery"]', {
    animated: false,
    fadeEffect: false,
    hideClass: false,
    showClass: false,
    zoomEffect: false,
    mainClass: 'gallery-fancybox',
    backdropClick: false,
    dragToClose: false,
    idle: false,
    closeButton: false,
    compact: function () {
      return false;
    },
    contentClick: false,
    wheel: 'slide',
    Images: {
      zoom: false,
      Panzoom: {
        touch: false,
        panOnlyZoomed: true,
      },
    },
    Carousel: {
      infinite: true,
      transition: 'fade',
      Navigation: {
        prevTpl:
          '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_gallery_desktop_prev)"><path d="M7.51394 7.48779C7.7626 7.48786 8.0056 7.56208 8.21186 7.70097C8.41813 7.83987 8.57828 8.03712 8.67185 8.26751C8.76542 8.4979 8.78816 8.75096 8.73715 8.99434C8.68615 9.23772 8.56372 9.46035 8.38552 9.63379L4.26931 13.75H28.7517C28.9174 13.7477 29.0818 13.7783 29.2355 13.84C29.3892 13.9018 29.5291 13.9935 29.6471 14.1098C29.7651 14.2261 29.8587 14.3647 29.9227 14.5175C29.9866 14.6703 30.0195 14.8343 30.0195 15C30.0195 15.1657 29.9866 15.3297 29.9227 15.4825C29.8587 15.6353 29.7651 15.7739 29.6471 15.8902C29.5291 16.0065 29.3892 16.0982 29.2355 16.16C29.0818 16.2217 28.9174 16.2523 28.7517 16.25H4.26931L8.38552 20.3662C8.50549 20.4814 8.60126 20.6194 8.66725 20.772C8.73323 20.9247 8.76809 21.089 8.76978 21.2553C8.77147 21.4216 8.73997 21.5865 8.6771 21.7405C8.61424 21.8945 8.52129 22.0344 8.40369 22.152C8.28609 22.2696 8.14621 22.3625 7.99224 22.4254C7.83827 22.4882 7.6733 22.5197 7.507 22.5181C7.3407 22.5164 7.1764 22.4815 7.02374 22.4155C6.87108 22.3495 6.73312 22.2538 6.61794 22.1338L0.367939 15.8838C0.133608 15.6494 0.00196838 15.3315 0.00196838 15C0.00196838 14.6685 0.133608 14.3506 0.367939 14.1162L6.61794 7.86621C6.73443 7.74647 6.87373 7.65129 7.02763 7.58629C7.18152 7.52129 7.34688 7.4878 7.51394 7.48779Z" fill="#151515"/></g><defs><clipPath id="clip0_gallery_desktop_prev"><rect width="30" height="30" fill="white" transform="matrix(-1 0 0 1 30 0)"/></clipPath></defs></svg>',
        nextTpl:
          '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_gallery_desktop_next)"><path d="M22.4861 7.48779C22.2374 7.48786 21.9944 7.56208 21.7881 7.70097C21.5819 7.83987 21.4217 8.03712 21.3282 8.26751C21.2346 8.4979 21.2118 8.75096 21.2628 8.99434C21.3139 9.23772 21.4363 9.46035 21.6145 9.63379L25.7307 13.75H1.24827C1.08263 13.7477 0.918178 13.7783 0.764468 13.84C0.610758 13.9018 0.470856 13.9935 0.352894 14.1098C0.234932 14.2261 0.141262 14.3647 0.0773274 14.5175C0.0133928 14.6703 -0.0195313 14.8343 -0.0195312 15C-0.0195313 15.1657 0.0133928 15.3297 0.0773274 15.4825C0.141262 15.6353 0.234932 15.7739 0.352894 15.8902C0.470856 16.0065 0.610758 16.0982 0.764468 16.16C0.918178 16.2217 1.08263 16.2523 1.24827 16.25H25.7307L21.6145 20.3662C21.4945 20.4814 21.3987 20.6194 21.3328 20.772C21.2668 20.9247 21.2319 21.089 21.2302 21.2553C21.2285 21.4216 21.26 21.5865 21.3229 21.7405C21.3858 21.8945 21.4787 22.0344 21.5963 22.152C21.7139 22.2696 21.8538 22.3625 22.0078 22.4254C22.1617 22.4882 22.3267 22.5197 22.493 22.5181C22.6593 22.5164 22.8236 22.4815 22.9763 22.4155C23.1289 22.3495 23.2669 22.2538 23.3821 22.1338L29.6321 15.8838C29.8664 15.6494 29.998 15.3315 29.998 15C29.998 14.6685 29.8664 14.3506 29.6321 14.1162L23.3821 7.86621C23.2656 7.74647 23.1263 7.65129 22.9724 7.58629C22.8185 7.52129 22.6531 7.4878 22.4861 7.48779Z" fill="#151515"/></g><defs><clipPath id="clip0_gallery_desktop_next"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>',
      },
      Thumbs: false,
      Toolbar: {
        enabled: false,
      },
    },
    on: {
      ready: function (fancybox) {
        scheduleFinalizeGalleryFancyboxUI(fancybox);
      },
      'Carousel.ready': function (fancybox) {
        mountGalleryFancyboxUI(fancybox, panelTemplate);
        scheduleFinalizeGalleryFancyboxUI(fancybox);
      },
      'Carousel.change': function (fancybox) {
        syncGalleryFancyboxThumbs(fancybox);
        resetGalleryFancyboxSlideScroll(fancybox);
        // Desktop can re-pin immediately; mobile waits for settle to avoid mid-fade jumps.
        if (!isGalleryFancyboxMobile()) {
          schedulePositionGalleryFancyboxNav(fancybox);
        }
      },
      'Carousel.settle': function (fancybox) {
        schedulePositionGalleryFancyboxNav(fancybox);
      },
      destroy: function (fancybox) {
        const instance = getGalleryFancyboxInstance(fancybox);
        const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
        if (!container) return;

        if (container._galleryNavResizeHandler) {
          window.removeEventListener('resize', container._galleryNavResizeHandler);
          container._galleryNavResizeHandler = null;
        }

        container
          .querySelectorAll(
            '.gallery-fancybox__aside, .gallery-fancybox__mobile-top, .gallery-fancybox__mobile-bar, .gallery-fancybox__thumbs, .gallery-fancybox__close-host'
          )
          .forEach(function (node) {
            node.remove();
          });
      },
    },
  });
}

function mountGalleryFancyboxUI(fancybox, panelTemplate) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container || container.querySelector('.gallery-fancybox__thumbs')) return;

  if (panelTemplate && panelTemplate.content) {
    container.appendChild(panelTemplate.content.cloneNode(true));
  }

  if (!container.querySelector('.gallery-fancybox__close-host')) {
    const closeHost = document.createElement('div');
    closeHost.className = 'gallery-fancybox__close-host';
    closeHost.innerHTML = GALLERY_FANCYBOX_CLOSE_HTML;
    container.appendChild(closeHost);
  }

  const thumbsRoot = document.createElement('div');
  thumbsRoot.className = 'gallery-fancybox__thumbs';
  const thumbsTrack = document.createElement('div');
  thumbsTrack.className = 'gallery-fancybox__thumbs-track';
  thumbsRoot.appendChild(thumbsTrack);

  const slides = getGalleryFancyboxSlides(instance || fancybox);
  slides.forEach(function (slide, index) {
    const trigger = slide.triggerEl;
    const thumbSrc =
      (trigger && trigger.dataset && trigger.dataset.thumb) ||
      (trigger && trigger.querySelector('img') && trigger.querySelector('img').src) ||
      slide.thumb ||
      slide.src;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-fancybox__thumb-item';
    btn.setAttribute('data-index', String(index));
    btn.setAttribute('aria-label', 'Slide ' + (index + 1));
    btn.innerHTML =
      '<span class="gallery-fancybox__thumb-frame"><img src="' +
      thumbSrc +
      '" alt="" loading="lazy" width="80" height="80" /></span>';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = getGalleryFancyboxCarousel(instance || fancybox);
      if (carousel && typeof carousel.slideTo === 'function') {
        carousel.slideTo(index);
      }
    });

    thumbsTrack.appendChild(btn);
  });

  container.appendChild(thumbsRoot);
  syncGalleryFancyboxThumbs(instance || fancybox);
}

function resetGalleryFancyboxSlideScroll(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container) return;

  container.querySelectorAll('.fancybox__slide').forEach(function (slide) {
    slide.scrollTop = 0;
    slide.scrollLeft = 0;
  });
}

function scheduleFinalizeGalleryFancyboxUI(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container) return;

  requestAnimationFrame(function () {
    finalizeGalleryFancyboxUI(container);
    resetGalleryFancyboxSlideScroll({ container: container });
    positionGalleryFancyboxNav(container);
  });

  window.setTimeout(function () {
    finalizeGalleryFancyboxUI(container);
    resetGalleryFancyboxSlideScroll({ container: container });
    positionGalleryFancyboxNav(container);
  }, 0);

  window.setTimeout(function () {
    positionGalleryFancyboxNav(container);
  }, 120);

  if (!container._galleryNavResizeHandler) {
    container._galleryNavResizeHandler = function () {
      positionGalleryFancyboxNav(container);
    };
    window.addEventListener('resize', container._galleryNavResizeHandler);
  }
}

function schedulePositionGalleryFancyboxNav(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container) return;

  requestAnimationFrame(function () {
    positionGalleryFancyboxNav(container);
  });
  window.setTimeout(function () {
    positionGalleryFancyboxNav(container);
  }, 80);
}

function clearGalleryFancyboxNavInlineStyles(nav, prevBtn, nextBtn) {
  if (nav) {
    nav.style.inset = '';
    nav.style.top = '';
    nav.style.left = '';
    nav.style.right = '';
    nav.style.bottom = '';
    nav.style.width = '';
    nav.style.height = '';
  }
  if (prevBtn) {
    prevBtn.style.top = '';
    prevBtn.style.left = '';
    prevBtn.style.right = '';
    prevBtn.style.transform = '';
  }
  if (nextBtn) {
    nextBtn.style.top = '';
    nextBtn.style.left = '';
    nextBtn.style.right = '';
    nextBtn.style.transform = '';
  }
}

function isGalleryFancyboxMobile() {
  return window.matchMedia('(max-width: 749px)').matches;
}

function restoreGalleryFancyboxNavHome(container, nav) {
  if (!nav || !container) return;
  if (!container._galleryNavHome) {
    const carousel = container.querySelector('.fancybox__carousel');
    container._galleryNavHome = carousel || nav.parentElement;
  }
  const home = container._galleryNavHome;
  if (home && nav.parentElement !== home) {
    home.appendChild(nav);
  }
}

function positionGalleryFancyboxNav(container) {
  if (!container) return;

  const nav = container.querySelector('.fancybox__nav');
  const prevBtn = container.querySelector('.fancybox__nav .f-button.is-prev');
  const nextBtn = container.querySelector('.fancybox__nav .f-button.is-next');
  if (!nav || !prevBtn || !nextBtn) return;

  container.querySelectorAll('.fancybox__slide').forEach(function (slide) {
    slide.scrollTop = 0;
    slide.scrollLeft = 0;
  });

  // One shared nav on the carousel — never nest inside slides.
  restoreGalleryFancyboxNavHome(container, nav);

  const slide =
    container.querySelector('.fancybox__slide.is-selected') ||
    container.querySelector('.fancybox__slide.has-image') ||
    container.querySelector('.fancybox__slide');
  if (!slide) return;

  const media =
    slide.querySelector('.fancybox__image') ||
    slide.querySelector('.f-panzoom__content img') ||
    slide.querySelector('.fancybox__content img') ||
    slide.querySelector('.fancybox__content');
  if (!media) return;

  const root = nav.offsetParent || container;
  const rootRect = root.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();
  if (mediaRect.width < 2 || mediaRect.height < 2) return;

  // Pin the single shared nav box to the current photo edges.
  nav.style.top = Math.round(mediaRect.top - rootRect.top) + 'px';
  nav.style.left = Math.round(mediaRect.left - rootRect.left) + 'px';
  nav.style.width = Math.round(mediaRect.width) + 'px';
  nav.style.height = Math.round(mediaRect.height) + 'px';
  nav.style.right = 'auto';
  nav.style.bottom = 'auto';

  prevBtn.style.top = '50%';
  nextBtn.style.top = '50%';

  if (isGalleryFancyboxMobile()) {
    // Mobile semicircle arrows sit flush on the photo edges.
    prevBtn.style.left = '0';
    nextBtn.style.right = '0';
  } else {
    // Desktop chevrons sit in the gutters beside the photo.
    prevBtn.style.left = '-48px';
    nextBtn.style.right = '-48px';
  }
  prevBtn.style.right = 'auto';
  nextBtn.style.left = 'auto';

  if (media.tagName === 'IMG' && !media.complete) {
    media.addEventListener(
      'load',
      function () {
        positionGalleryFancyboxNav(container);
      },
      { once: true }
    );
  }
}

function finalizeGalleryFancyboxUI(container) {
  container.classList.remove('is-compact');

  container
    .querySelectorAll(
      '.fancybox__infobar, [data-panzoom-action], [data-fancybox-toggle-slideshow], [data-fancybox-toggle-fullscreen], [data-fancybox-toggle-thumbs], [data-fancybox-download]'
    )
    .forEach(function (node) {
      node.remove();
    });

  container.querySelectorAll('.f-carousel__toolbar .f-button:not(.is-close-btn)').forEach(function (btn) {
    btn.remove();
  });

  container.querySelectorAll('.fancybox__nav .f-button').forEach(function (btn) {
    btn.removeAttribute('title');
  });

  applyGalleryFancyboxNavArrows(container);
}

function applyGalleryFancyboxNavArrows(container) {
  const isMobile = window.matchMedia('(max-width: 749px)').matches;
  const prevBtn = container.querySelector('.fancybox__nav .f-button.is-prev');
  const nextBtn = container.querySelector('.fancybox__nav .f-button.is-next');
  if (!prevBtn || !nextBtn) return;

  if (!container._galleryNavPrevTpl) {
    container._galleryNavPrevTpl = prevBtn.innerHTML;
    container._galleryNavNextTpl = nextBtn.innerHTML;
  }

  if (isMobile) {
    const prevSrc =
      (document.querySelector('[data-gallery-fancybox-arrow-prev]') || {}).src ||
      prevBtn.dataset.mobileArrowPrev;
    const nextSrc =
      (document.querySelector('[data-gallery-fancybox-arrow-next]') || {}).src ||
      nextBtn.dataset.mobileArrowNext;

    if (prevSrc) {
      prevBtn.innerHTML =
        '<img src="' + prevSrc + '" alt="" width="27" height="54" aria-hidden="true" class="gallery-fancybox__nav-img" />';
    }
    if (nextSrc) {
      nextBtn.innerHTML =
        '<img src="' + nextSrc + '" alt="" width="27" height="54" aria-hidden="true" class="gallery-fancybox__nav-img" />';
    }
  } else {
    prevBtn.innerHTML = container._galleryNavPrevTpl;
    nextBtn.innerHTML = container._galleryNavNextTpl;
  }
}

function syncGalleryFancyboxThumbs(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container) return;

  const currentIndex = getGalleryFancyboxSlideIndex(instance || fancybox);
  container.querySelectorAll('.gallery-fancybox__thumb-item').forEach(function (btn) {
    const index = Number(btn.getAttribute('data-index'));
    btn.classList.toggle('is-selected', index === currentIndex);
  });

  const active = container.querySelector('.gallery-fancybox__thumb-item.is-selected');
  if (active) {
    active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}
