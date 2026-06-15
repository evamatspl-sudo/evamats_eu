if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        liveRegion: this.querySelector('[id^="GalleryStatus"]'),
        viewer: this.querySelector('[id^="GalleryViewer"]'),
        thumbnails: this.querySelector('[id^="GalleryThumbnails"]')
      }
      this.mql = window.matchMedia('(min-width: 750px)');
      this.isEvamatsGallery = !!this.closest('.evamats-product-gallery');
      if (!this.elements.thumbnails) return;

      this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
      this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
        mediaToSwitch.querySelector('button').addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
      });
      if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();

      if (this.isEvamatsGallery) {
        requestAnimationFrame(() => this.initEvamatsGalleryArrows());
      }
    }

    initEvamatsGalleryArrows() {
      const viewer = this.elements.viewer;
      if (!viewer) return;

      let prevBtn = viewer.querySelector('.slider-button--prev');
      let nextBtn = viewer.querySelector('.slider-button--next');
      if (!prevBtn || !nextBtn) return;

      prevBtn = this.replaceEvamatsArrowButton(prevBtn);
      nextBtn = this.replaceEvamatsArrowButton(nextBtn);
      this.evamatsPrevBtn = prevBtn;
      this.evamatsNextBtn = nextBtn;

      prevBtn.addEventListener('click', (event) => this.onEvamatsArrowClick(event, 'prev'));
      nextBtn.addEventListener('click', (event) => this.onEvamatsArrowClick(event, 'next'));

      const slider = viewer.querySelector('[id^="Slider-"]');
      if (slider) {
        this.onEvamatsSliderScrollEnd = debounce(() => this.syncEvamatsSlideFromScroll(), 120);
        slider.addEventListener('scroll', () => {
          if (!this.mql.matches && this.isEvamatsGallery) {
            this.updateEvamatsArrowButtons();
            this.updateEvamatsGalleryDots();
            this.onEvamatsSliderScrollEnd();
            return;
          }

          this.updateEvamatsArrowButtons();
          this.updateEvamatsGalleryDots();
        }, { passive: true });
      }

      this.initEvamatsGalleryDots();
      this.updateEvamatsArrowButtons();
    }

    getEvamatsScrollSlides() {
      return this.getEvamatsViewerSlides().filter((slide) => slide.clientWidth > 0);
    }

    getEvamatsSlideOffset(slides = this.getEvamatsScrollSlides()) {
      if (slides.length < 2) return slides[0]?.clientWidth || 0;
      return slides[1].offsetLeft - slides[0].offsetLeft;
    }

    getEvamatsScrollIndex() {
      const viewer = this.elements.viewer;
      const slider = viewer.querySelector('[id^="Slider-"]');
      const slides = this.getEvamatsScrollSlides();
      if (!slider || !slides.length) return 0;

      const slideOffset = this.getEvamatsSlideOffset(slides);
      if (!slideOffset) return 0;

      return Math.max(0, Math.min(slides.length - 1, Math.round(slider.scrollLeft / slideOffset)));
    }

    syncEvamatsSlideFromScroll() {
      if (this.mql.matches || !this.isEvamatsGallery) return;

      const slides = this.getEvamatsScrollSlides();
      const slide = slides[this.getEvamatsScrollIndex()];
      if (!slide || slide.classList.contains('is-active')) {
        this.updateEvamatsGalleryDots();
        return;
      }

      this.syncActiveSlideWithoutScroll(slide.dataset.mediaId);
      this.updateEvamatsGalleryDots();
    }

    syncActiveSlideWithoutScroll(mediaId) {
      const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
      if (!activeMedia) return;

      this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });
      activeMedia.classList.add('is-active');

      if (this.elements.thumbnails) {
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        if (activeThumbnail) {
          this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('aria-current'));
          activeThumbnail.querySelector('button')?.setAttribute('aria-current', true);
        }
      }

      this.playActiveMedia(activeMedia);
    }

    usesEvamatsSingleSlideNav() {
      return this.isEvamatsGallery && this.mql.matches && this.dataset.desktopLayout.includes('thumbnail');
    }

    getEvamatsViewerSlides() {
      return [...this.elements.viewer.querySelectorAll('[id^="Slide-"][data-media-id]')];
    }

    getEvamatsNavItems() {
      if (this.mql.matches && this.dataset.desktopLayout.includes('thumbnail')) {
        return this.getEvamatsVisibleThumbnails().map((item) => ({
          mediaId: item.dataset.target
        }));
      }

      return this.getEvamatsViewerSlides().map((slide) => ({
        mediaId: slide.dataset.mediaId
      }));
    }

    getEvamatsActiveNavIndex() {
      if (this.mql.matches && this.dataset.desktopLayout.includes('thumbnail')) {
        const index = this.getEvamatsVisibleThumbnails().findIndex((item) => item.querySelector('[aria-current]'));
        return index >= 0 ? index : 0;
      }

      return this.getEvamatsScrollIndex();
    }

    navigateEvamatsGallery(direction) {
      const items = this.getEvamatsNavItems();
      const currentIndex = this.getEvamatsActiveNavIndex();
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= items.length) return false;

      this.setActiveMedia(items[nextIndex].mediaId, false);
      return true;
    }

    initEvamatsGalleryDots() {
      const viewer = this.elements.viewer;
      if (!viewer) return;

      const dotsContainer = viewer.querySelector('.evamats-product-gallery__dots');
      if (!dotsContainer) return;

      if (!this.mql.matches) {
        const slides = this.getEvamatsViewerSlides();
        dotsContainer.replaceChildren();

        if (slides.length <= 1) {
          dotsContainer.hidden = true;
          this.evamatsDots = [];
          return;
        }

        dotsContainer.hidden = false;
        slides.forEach((slide, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `slider-counter__link slider-counter__link--dots${index === 0 ? ' slider-counter__link--active' : ''}`;
          button.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
          button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
          button.innerHTML = '<span class="dot"></span>';
          dotsContainer.appendChild(button);
        });
      }

      this.evamatsDots = [...dotsContainer.querySelectorAll('.slider-counter__link')];
      this.evamatsDots.forEach((dot, index) => {
        dot.addEventListener('click', (event) => this.onEvamatsDotClick(event, index));
      });

      this.updateEvamatsGalleryDots();
    }

    onEvamatsDotClick(event, index) {
      event.preventDefault();

      if (this.usesEvamatsSingleSlideNav()) {
        const items = this.getEvamatsNavItems();
        if (!items[index]) return;
        this.setActiveMedia(items[index].mediaId, false);
        return;
      }

      const viewer = this.elements.viewer;
      const slider = viewer.querySelector('[id^="Slider-"]');
      const slides = this.getEvamatsScrollSlides();
      if (!slider || !slides[index]) return;

      slider.scrollTo({ left: slides[index].offsetLeft, behavior: 'smooth' });
      window.setTimeout(() => {
        this.syncEvamatsSlideFromScroll();
        this.updateEvamatsArrowButtons();
      }, 300);
    }

    updateEvamatsGalleryDots() {
      if (!this.evamatsDots?.length) return;

      const activeIndex = this.usesEvamatsSingleSlideNav()
        ? this.getEvamatsActiveNavIndex()
        : this.getEvamatsScrollIndex();

      this.evamatsDots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle('slider-counter__link--active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    replaceEvamatsArrowButton(button) {
      const clone = button.cloneNode(true);
      button.parentNode.replaceChild(clone, button);
      return clone;
    }

    getEvamatsVisibleThumbnails() {
      return [...this.elements.thumbnails.querySelectorAll('.thumbnail-list__item')].filter((item) => {
        return item.offsetParent !== null && getComputedStyle(item).display !== 'none';
      });
    }

    onEvamatsArrowClick(event, direction) {
      event.preventDefault();

      if (this.usesEvamatsSingleSlideNav()) {
        this.navigateEvamatsGallery(direction);
        this.updateEvamatsArrowButtons();
        this.updateEvamatsGalleryDots();
        return;
      }

      const viewer = this.elements.viewer;
      const slider = viewer.querySelector('[id^="Slider-"]');
      if (!slider) return;

      const slides = this.getEvamatsScrollSlides();
      if (slides.length < 2) return;

      const slideOffset = this.getEvamatsSlideOffset(slides);
      const scrollPosition = direction === 'next'
        ? slider.scrollLeft + slideOffset
        : slider.scrollLeft - slideOffset;

      slider.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      window.setTimeout(() => {
        this.syncEvamatsSlideFromScroll();
        this.updateEvamatsArrowButtons();
      }, 300);
    }

    updateEvamatsArrowButtons() {
      if (!this.evamatsPrevBtn || !this.evamatsNextBtn) return;

      if (this.usesEvamatsSingleSlideNav()) {
        const items = this.getEvamatsNavItems();
        const currentIndex = this.getEvamatsActiveNavIndex();

        this.evamatsPrevBtn.toggleAttribute('disabled', currentIndex <= 0);
        this.evamatsNextBtn.toggleAttribute('disabled', currentIndex >= items.length - 1);
        return;
      }

      const viewer = this.elements.viewer;
      const slider = viewer.querySelector('[id^="Slider-"]');
      if (!slider) return;

      const slides = this.getEvamatsScrollSlides();
      if (slides.length < 2) {
        this.evamatsPrevBtn.setAttribute('disabled', 'disabled');
        this.evamatsNextBtn.setAttribute('disabled', 'disabled');
        return;
      }

      const slideOffset = this.getEvamatsSlideOffset(slides);
      const maxScroll = slider.scrollWidth - slider.clientWidth;

      this.evamatsPrevBtn.toggleAttribute('disabled', slider.scrollLeft <= 0);
      this.evamatsNextBtn.toggleAttribute('disabled', slider.scrollLeft >= maxScroll - slideOffset / 2);
    }

    onSlideChanged(event) {
      const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${ event.detail.currentElement.dataset.mediaId }"]`);
      this.setActiveThumbnail(thumbnail);
    }

    setActiveMedia(mediaId, prepend) {
      const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${ mediaId }"]`);
      this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });
      activeMedia.classList.add('is-active');

      if (prepend) {
        activeMedia.parentElement.prepend(activeMedia);
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
          activeThumbnail.parentElement.prepend(activeThumbnail);
        }
        if (this.elements.viewer.slider) this.elements.viewer.resetPages();
      }

      this.preventStickyHeader();
      window.setTimeout(() => {
        if (this.isEvamatsGallery && this.usesEvamatsSingleSlideNav()) {
          // Desktop EvaMats: one active slide, no horizontal scroll.
        } else if (this.isEvamatsGallery && !this.mql.matches) {
          activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft, behavior: 'smooth' });
        } else if (this.elements.thumbnails) {
          activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
        }

        if (!this.isEvamatsGallery && (!this.elements.thumbnails || this.dataset.desktopLayout === 'stacked')) {
          activeMedia.scrollIntoView({behavior: 'smooth'});
        }
      });
      this.playActiveMedia(activeMedia);

      if (!this.elements.thumbnails) return;
      const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
      this.setActiveThumbnail(activeThumbnail);
      this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);

      if (this.isEvamatsGallery) this.updateEvamatsArrowButtons();
      if (this.isEvamatsGallery) this.updateEvamatsGalleryDots();
    }

    setActiveThumbnail(thumbnail) {
      if (!this.elements.thumbnails || !thumbnail) return;

      this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('aria-current'));
      thumbnail.querySelector('button').setAttribute('aria-current', true);

      const slider = this.elements.thumbnails.slider || this.elements.thumbnails.querySelector('[id^="Slider-"]');
      if (!slider) return;

      if (this.isEvamatsGallery && this.mql.matches) {
        const thumbTop = thumbnail.offsetTop;
        const thumbBottom = thumbTop + thumbnail.offsetHeight;
        const viewTop = slider.scrollTop;
        const viewBottom = viewTop + slider.clientHeight;

        if (thumbTop < viewTop || thumbBottom > viewBottom) {
          slider.scrollTo({ top: Math.max(thumbTop - 12, 0), behavior: 'smooth' });
        }
        return;
      }

      if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

      slider.scrollTo({ left: thumbnail.offsetLeft });
    }

    announceLiveRegion(activeItem, position) {
      const image = activeItem.querySelector('.product__modal-opener--image img');
      if (!image) return;
      image.onload = () => {
        this.elements.liveRegion.setAttribute('aria-hidden', false);
        this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace(
          '[index]',
          position
        );
        setTimeout(() => {
          this.elements.liveRegion.setAttribute('aria-hidden', true);
        }, 2000);
      };
      image.src = image.src;
    }

    playActiveMedia(activeItem) {
      window.pauseAllMedia();
      const deferredMedia = activeItem.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }

    preventStickyHeader() {
      this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
      if (!this.stickyHeader) return;
      this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    }

    removeListSemantic() {
      if (!this.elements.viewer.slider) return;
      this.elements.viewer.slider.setAttribute('role', 'presentation');
      this.elements.viewer.sliderItems.forEach(slide => slide.setAttribute('role', 'presentation'));
    }
  });
}
