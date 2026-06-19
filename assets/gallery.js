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
  initGalleryFancybox();
});

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
    closeButton: false,
    compact: function () {
      return false;
    },
    contentClick: false,
    wheel: 'slide',
    Images: {
      zoom: false,
    },
    Carousel: {
      infinite: true,
      transition: 'fade',
      Navigation: {
        prevTpl:
          '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        nextTpl:
          '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
      },
      destroy: function (fancybox) {
        const instance = getGalleryFancyboxInstance(fancybox);
        const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
        if (!container) return;

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

function scheduleFinalizeGalleryFancyboxUI(fancybox) {
  const instance = getGalleryFancyboxInstance(fancybox);
  const container = instance && instance.container ? instance.container : fancybox && fancybox.container;
  if (!container) return;

  requestAnimationFrame(function () {
    finalizeGalleryFancyboxUI(container);
  });

  window.setTimeout(function () {
    finalizeGalleryFancyboxUI(container);
  }, 0);
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
