document.addEventListener("DOMContentLoaded", function () {
    
    var metaRobots = document.querySelector('meta[name="robots"][content="noindex, follow"]');

    if (metaRobots) {
        var canonicalTag = document.querySelector('link[rel="canonical"]');
        if (canonicalTag) {
            canonicalTag.parentNode.removeChild(canonicalTag);
        }
    }
});

(function () {
  window.equalizeDrawerUpsellHeights = function (root) {
    if (!root) return;
    var slides = root.querySelectorAll('.swiper-slide');
    if (!slides.length) return;
    var i;
    for (i = 0; i < slides.length; i++) {
      slides[i].style.height = '';
    }
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 749px)').matches) {
      return;
    }
    if (window.innerWidth <= 749) return;
    var max = 0;
    for (i = 0; i < slides.length; i++) {
      max = Math.max(max, slides[i].offsetHeight);
    }
    if (max < 1) return;
    for (i = 0; i < slides.length; i++) {
      slides[i].style.height = max + 'px';
    }
  };

  window.initDrawerProgressUpsell = function (root) {
    if (!root) root = document.querySelector('.drawer__progress_products');
    if (!root) return null;
    var navRoot = root.closest('.drawer__progress_products-block') || root.parentElement;

    if (root.swiper) root.swiper.destroy(true, true);

    function updateChrome(swiper) {
      if (!navRoot || !swiper) return;
      var locked = swiper.isLocked;
      navRoot.classList.toggle('has-fade-prev', !locked && !swiper.isBeginning);
      navRoot.classList.toggle('has-fade-next', !locked && !swiper.isEnd);
    }

    function run() {
      if (typeof Swiper === 'undefined') return null;
      var eq = function () {
        if (window.equalizeDrawerUpsellHeights) window.equalizeDrawerUpsellHeights(root);
      };
      var sync = function (swiper) {
        eq();
        updateChrome(swiper);
      };
      var swiper = new Swiper(root, {
        spaceBetween: 8,
        slidesPerView: 'auto',
        watchOverflow: true,
        observer: true,
        observeParents: true,
        navigation: {
          nextEl: navRoot.querySelector('.swiper-button-next'),
          prevEl: navRoot.querySelector('.swiper-button-prev'),
        },
        on: {
          init: sync,
          resize: sync,
          slideChange: updateChrome,
          slideChangeTransitionEnd: sync,
          reachBeginning: updateChrome,
          reachEnd: updateChrome,
          fromEdge: updateChrome,
        },
      });
      sync(swiper);
      setTimeout(function () {
        sync(swiper);
      }, 50);
      setTimeout(function () {
        sync(swiper);
      }, 250);
      root.querySelectorAll('img').forEach(function (img) {
        if (img.complete) return;
        img.addEventListener(
          'load',
          function () {
            sync(swiper);
            swiper.update();
          },
          { once: true }
        );
      });
      return swiper;
    }

    if (window.ensureSwiperLoaded) {
      window.ensureSwiperLoaded(run);
      return null;
    }
    return run();
  };
})();

document.addEventListener('DOMContentLoaded', function () {
    var searchIcon = document.querySelector('.header__icon--search');
    var closeButton = document.querySelector('.search-modal__close-button');
    var searchForm = document.querySelector('.search-modal__form');

    function handleClick() {
        if (searchForm.hasAttribute('open')) {
        } else {
        }
    }

    searchIcon.addEventListener('click', handleClick);
    closeButton.addEventListener('click', handleClick);
});

// product upsell variant buttons - поддержка товаров с опциями и без (инициализация при появлении секции в viewport)
(function () {
  const upsellContainer = document.querySelector('.product__upsell');
  if (!upsellContainer) return;

  function initUpsellVariants() {
    function getSizedImageUrl(src, size) {
      if (!src) return src;
      return src;
    }

    const upsellItems = document.querySelectorAll('.product__upsell_item');

    upsellItems.forEach(upsellItem => {
      const buttons = upsellItem.querySelectorAll('.product__upsell_item_variant');
      const checkbox = upsellItem.querySelector('input[name="product__upsell"]');
      const variantsJson = upsellItem.dataset.variants;
      const zoomImg = upsellItem.querySelector('.product__upsell_image_zoom');
      const priceEl = upsellItem.querySelector('.product__upsell_price');

      if (!checkbox || !variantsJson) {
        console.warn('Missing checkbox or variants for:', upsellItem);
        return;
      }

      const variants = JSON.parse(variantsJson);

      if (!buttons.length) {
        return;
      }

      function updateZoomImageForSize() {
        if (!zoomImg) return;
        const sizeGroup = Array.from(upsellItem.querySelectorAll('.option-group')).find((group) => {
          const groupName = ((group.dataset.group || '') + '').toLowerCase();
          return groupName.includes('size') || groupName.includes('rozmiar') || groupName.includes('gro');
        });
        if (!sizeGroup) return;
        const activeSize = sizeGroup.querySelector('.product__upsell_item_variant.active');
        const selected = ((activeSize?.dataset?.value) || '').trim().toUpperCase();
        const defaultSrc = zoomImg.dataset.imageDefault || zoomImg.getAttribute('src');
        const xlSrc = zoomImg.dataset.imageXl || defaultSrc;
        zoomImg.setAttribute('src', selected === 'XL' ? xlSrc : defaultSrc);
      }

      function formatUpsellPrice(cents) {
        if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
          return window.Shopify.formatMoney(cents);
        }
        const currency = (priceEl?.textContent || '').replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
        const amount = (Number(cents) || 0) / 100;
        return `${amount.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`.trim();
      }

      function updateUpsellPrice(cents, variant) {
        const priceRow = upsellItem.querySelector('.product__upsell_price-row');
        const regularEl = priceRow?.querySelector('.product__upsell_price') || priceEl;
        const compareEl = priceRow?.querySelector('.product__upsell_price_compare');
        const discountEl = priceRow?.querySelector('.product__upsell_discount');

        if (regularEl) {
          regularEl.textContent = formatUpsellPrice(cents);
        } else if (priceEl) {
          priceEl.textContent = formatUpsellPrice(cents);
        }

        if (!compareEl || !discountEl) return;

        const compareCents = variant?.compare_at_price;
        if (compareCents && compareCents > cents) {
          compareEl.textContent = formatUpsellPrice(compareCents);
          compareEl.classList.remove('hidden');
          const discountValueEl = discountEl.querySelector('.product__upsell_discount__value');
          (discountValueEl || discountEl).textContent = `${Math.round(((compareCents - cents) / compareCents) * 100)}%`;
          discountEl.classList.remove('hidden');
        } else {
          compareEl.classList.add('hidden');
          discountEl.classList.add('hidden');
        }
      }

      function updateCheckbox() {
        const selectedOptions = {};
        const groups = upsellItem.querySelectorAll('.option-group');

        groups.forEach(group => {
          const optionIndex = parseInt(group.dataset.optionIndex, 10) + 1;
          const activeButton = group.querySelector('.product__upsell_item_variant.active');
          if (activeButton) {
            selectedOptions[`option${optionIndex}`] = activeButton.dataset.value;
          }
        });

        const matchingVariant = variants.find(variant => {
          return Object.keys(selectedOptions).every(key => variant[key] === selectedOptions[key]);
        });

        if (matchingVariant) {
          checkbox.value = matchingVariant.id;
          checkbox.dataset.price = matchingVariant.price;
          updateUpsellPrice(matchingVariant.price, matchingVariant);

          if (matchingVariant.featured_image && matchingVariant.featured_image.src) {
            const src = matchingVariant.featured_image.src;
            const mainImg = upsellItem.querySelector('.product__upsell_image');
            if (mainImg) {
              mainImg.src = getSizedImageUrl(src, 300);
            }
          }
        } else {
          checkbox.value = variants[0].id;
          checkbox.dataset.price = variants[0].price;
          updateUpsellPrice(variants[0].price, variants[0]);
          if (variants[0].featured_image && variants[0].featured_image.src) {
            const src = variants[0].featured_image.src;
            const mainImg = upsellItem.querySelector('.product__upsell_image');
            if (mainImg) {
              mainImg.src = getSizedImageUrl(src, 300);
            }
          }
        }
        updateZoomImageForSize();
      }

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const groupContainer = btn.closest('.option-group');
          if (!groupContainer) return;

          const currentItem = btn.closest('.product__upsell_item');
          if (!currentItem) return;

          groupContainer.querySelectorAll('.product__upsell_item_variant').forEach(el => el.classList.remove('active'));

          // "Mounted" option can be selected only for one heel item.
          const value = (btn.dataset.value || '').trim();
          const isMountOption = btn.classList.contains('montaz-option');
          const isMounted = isMountOption && value.includes('+');

          if (isMounted) {
            document.querySelectorAll('.product__upsell_item').forEach(item => {
              if (item === currentItem) return;

              const mountGroup = item.querySelector('.option-group .montaz-option')?.closest('.option-group');
              if (!mountGroup) return;

              const mountedBtn = Array.from(mountGroup.querySelectorAll('.product__upsell_item_variant'))
                .find(el => (el.dataset.value || '').includes('+'));
              const unmountedBtn = Array.from(mountGroup.querySelectorAll('.product__upsell_item_variant'))
                .find(el => !(el.dataset.value || '').includes('+'));

              if (!mountedBtn || !unmountedBtn) return;

              mountedBtn.classList.remove('active');
              unmountedBtn.classList.add('active');

              const otherCheckbox = item.querySelector('input[name="product__upsell"]');
              const otherVariants = JSON.parse(item.dataset.variants || '[]');
              const otherGroups = item.querySelectorAll('.option-group');
              const otherSelected = {};

              otherGroups.forEach(group => {
                const idx = parseInt(group.dataset.optionIndex, 10) + 1;
                const active = group.querySelector('.product__upsell_item_variant.active');
                if (active) otherSelected[`option${idx}`] = active.dataset.value;
              });

              const otherMatch = otherVariants.find(v => Object.keys(otherSelected).every(k => v[k] === otherSelected[k]));
              if (otherCheckbox && otherMatch) {
                otherCheckbox.value = otherMatch.id;
                otherCheckbox.dataset.price = otherMatch.price;
                const otherPriceEl = item.querySelector('.product__upsell_price');
                const otherPriceRow = item.querySelector('.product__upsell_price-row');
                const otherRegularEl = otherPriceRow?.querySelector('.product__upsell_price') || otherPriceEl;
                const otherCompareEl = otherPriceRow?.querySelector('.product__upsell_price_compare');
                const otherDiscountEl = otherPriceRow?.querySelector('.product__upsell_discount');
                if (otherRegularEl) {
                  if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
                    otherRegularEl.textContent = window.Shopify.formatMoney(otherMatch.price);
                  } else {
                    const otherCurrency = (otherRegularEl.textContent || '').replace(/[\d.,\s\u00A0-]/g, '').trim() || '€';
                    const otherAmount = (Number(otherMatch.price) || 0) / 100;
                    otherRegularEl.textContent = `${otherAmount.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${otherCurrency}`.trim();
                  }
                }
                if (otherCompareEl && otherDiscountEl) {
                  const compareCents = otherMatch.compare_at_price;
                  if (compareCents && compareCents > otherMatch.price) {
                    otherCompareEl.textContent = window.Shopify?.formatMoney
                      ? window.Shopify.formatMoney(compareCents)
                      : otherCompareEl.textContent;
                    otherCompareEl.classList.remove('hidden');
                    const otherDiscountValueEl = otherDiscountEl.querySelector('.product__upsell_discount__value');
                    (otherDiscountValueEl || otherDiscountEl).textContent = `${Math.round(((compareCents - otherMatch.price) / compareCents) * 100)}%`;
                    otherDiscountEl.classList.remove('hidden');
                  } else {
                    otherCompareEl.classList.add('hidden');
                    otherDiscountEl.classList.add('hidden');
                  }
                }
              }
            });
          }

          btn.classList.add('active');

          if (groupContainer.querySelector('.option_value')) {
            const optionValueDiv = groupContainer.querySelector('.option_value');
            const displayLabel = (btn.dataset.label || '').trim();
            optionValueDiv.textContent = displayLabel || btn.dataset.value || '';
          }

          updateCheckbox();

          const variantRadios = document.querySelector('variant-radios');
          if (variantRadios && typeof variantRadios.updatePrices === 'function') {
            variantRadios.updatePrices();
          }
        });
      });

      updateCheckbox();
    });
  }

  const upsellVariantsIO = new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    initUpsellVariants();
  }, { threshold: 0.1 });

  upsellVariantsIO.observe(upsellContainer);
})();

document.addEventListener('DOMContentLoaded', function () {
    // Получаем все элементы продуктов
    const productItems = document.querySelectorAll('#Slider .grid__item');
    const productArray = Array.from(productItems);

    // Проверяем, есть ли доступные продукты
    if (productArray.length === 0) {
        console.warn("Нет доступных продуктов для отображения!");
        return; // Если нет продуктов, выходим
    }

    // Перемешиваем массив с продуктами
    for (let i = productArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [productArray[i], productArray[j]] = [productArray[j], productArray[i]];
    }

    // Скрываем все элементы перед показом
    productArray.forEach(item => {
        item.style.display = "none"; // Скрываем все карточки
    });

    // Отображаем ровно 4 случайных продукта
    for (let i = 0; i < Math.min(4, productArray.length); i++) {
        productArray[i].style.display = "list-item"; // Показываем элемент
    }
});

// product upsell variant buttons
// (function () {
//     if (document.querySelector('.product__upsell_item_variant')) {
//         const buttons = document.querySelectorAll('.product__upsell_item .product__upsell_item_variant')

//         buttons.forEach(el => {
//             el.addEventListener('click', () => {
//                 const checkbox = el.closest('.product__upsell_item').querySelector('input[type="checkbox"]')
//                 buttons.forEach(element => {
//                     element.classList.remove('active')
//                 })
//                 el.classList.add('active')
//                 if (el.closest('.product__info-wrapper')) {
//                     checkbox.value = el.dataset.id                    
//                 }
//             })
//         })
//     }
// })();
// product upsell variant buttons

// video reviews
(function () {
    function hydrateVideoSource(video) {
        if (!video || video.src) return;
        var src = video.getAttribute('data-src');
        if (!src) return;
        video.src = src;
        video.removeAttribute('data-src');
    }

    function hydrateSliderVideos(container) {
        if (!container) return;
        container.querySelectorAll('video[data-src]').forEach(function (video) {
            hydrateVideoSource(video);
            if (video.src) {
                video.load();
            }
        });
    }

    var root = document.querySelector('.video_reviews');
    if (!root) return;
    var runVideoReviews = function () {
        if (typeof Swiper === 'undefined') return;
        var videoFullScreenContainer = root.querySelector('.video_reviews__container_full');
        var closeFullscreen = videoFullScreenContainer && videoFullScreenContainer.querySelector('.close');
        var mainEl = root.querySelector('.video_reviews__container_slider');
        if (!videoFullScreenContainer || !mainEl) return;

        var isVisible = false;
        var swiper = null;

        var toggleTrustbadgeClass = function (add) {
            var trustbadge = document.querySelector('[id*="trustbadge-container"]');
            if (!trustbadge) return;
            if (add) {
                trustbadge.classList.add('z_index_one');
            } else {
                trustbadge.classList.remove('z_index_one');
            }
        };

        if (closeFullscreen) {
            closeFullscreen.addEventListener('click', function () {
                videoFullScreenContainer.classList.remove('active');
                videoFullScreenContainer.querySelectorAll('video').forEach(function (video) {
                    video.pause();
                    video.currentTime = 0.1;
                    video.load();
                });
                if (swiper && swiper.autoplay) swiper.autoplay.start();
                toggleTrustbadgeClass(false);
            });
        }
        videoFullScreenContainer.addEventListener('click', function (e) {
            if (e.target.tagName !== 'VIDEO') {
                videoFullScreenContainer.classList.remove('active');
                videoFullScreenContainer.querySelectorAll('video').forEach(function (video) {
                    video.pause();
                    video.currentTime = 0.1;
                    video.load();
                });
                if (swiper && swiper.autoplay) swiper.autoplay.start();
                toggleTrustbadgeClass(false);
            }
        });

        var videoPlay = function (slider, full) {
            if (!isVisible) return;
            if (!slider || !slider.el) return;
            slider.el.querySelectorAll('video').forEach(function (video) {
                video.pause();
            });
            var slide = slider.slides[slider.activeIndex];
            if (!slide) return;
            var video = slide.querySelector('video');
            if (video) {
                hydrateVideoSource(video);
                video.currentTime = 0.2;
                video.play().catch(function () {});
                video.volume = 0.08;
                if (!full) {
                    video.muted = true;
                }
            }
        };

        var swiper2 = new Swiper(videoFullScreenContainer, {
            loop: true,
            direction: 'vertical',
            slidesPerView: 1,
            mousewheel: {
                enabled: true,
                thresholdTime: 300,
            },
            on: {
                transitionEnd: function () {
                    if (this.el.classList.contains('active')) {
                        videoPlay(this, true);
                    }
                },
            },
        });

        var prevBtn = root.querySelector('.video_reviews__slider-bleed .eva-slider-nav--prev');
        var nextBtn = root.querySelector('.video_reviews__slider-bleed .eva-slider-nav--next');

        var mainOpts = {
            loop: true,
            slidesPerView: 'auto',
            spaceBetween: 0,
            speed: 480,
            watchOverflow: true,
            centeredSlides: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            thumbs: {
                swiper: swiper2,
            },
            on: {
                transitionEnd: function () {
                    videoPlay(this);
                },
                click: function () {
                    var clicked = this.clickedSlide;
                    if (!clicked) return;
                    var idxAttr = clicked.getAttribute('data-swiper-slide-index');
                    var slideRealIndex =
                        idxAttr !== null && idxAttr !== ''
                            ? parseInt(idxAttr, 10)
                            : NaN;
                    if (isNaN(slideRealIndex)) {
                        slideRealIndex =
                            typeof this.getSlideIndex === 'function'
                                ? this.getSlideIndex(clicked)
                                : this.clickedIndex;
                    }
                    var active = this.slides[this.activeIndex];
                    if (clicked !== active) {
                        this.slideToClickedSlide();
                    }
                    videoFullScreenContainer.classList.add('active');
                    if (typeof swiper2.slideToLoop === 'function') {
                        swiper2.slideToLoop(slideRealIndex, 0, false);
                    } else {
                        swiper2.slideTo(slideRealIndex, 0, false);
                    }
                    this.autoplay.stop();
                    toggleTrustbadgeClass(true);
                    setTimeout(function () {
                        videoPlay(swiper2, true);
                    }, 0);
                },
                init: function () {
                    hydrateSliderVideos(this.el);
                    this.slides.forEach(function (element) {
                        element.querySelectorAll('video').forEach(function (video) {
                            video.currentTime = 0.2;
                        });
                    });
                },
            },
        };
        if (prevBtn && nextBtn) {
            mainOpts.navigation = { nextEl: nextBtn, prevEl: prevBtn };
        }

        swiper = new Swiper(mainEl, mainOpts);
        hydrateSliderVideos(mainEl);
        hydrateSliderVideos(videoFullScreenContainer);

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                isVisible = entry.isIntersecting;
                if (isVisible) {
                    if (swiper && swiper.autoplay) swiper.autoplay.start();
                    videoPlay(swiper);
                } else {
                    if (swiper && swiper.autoplay) swiper.autoplay.stop();
                    if (swiper && swiper.slides) {
                        swiper.slides.forEach(function (slide) {
                            slide.querySelectorAll('video').forEach(function (video) {
                                video.pause();
                            });
                        });
                    }
                }
            });
        }, { threshold: 0.5 });

        observer.observe(mainEl);

        videoPlay(swiper);
    };
    var videoReviewsIO = new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        if (typeof window.ensureSwiperLoaded === 'function') {
            window.ensureSwiperLoaded(runVideoReviews);
        } else {
            runVideoReviews();
        }
    }, { threshold: 0.1 });
    videoReviewsIO.observe(root);
})();
// video reviews


// toggle popup
(function () {
    if (document.querySelector('.popup_overlay')) { 
        document.addEventListener('DOMContentLoaded', function() {
            const openPopupBtn = document.querySelectorAll('.openPopup');
            const closePopupBtn = document.querySelectorAll('.popup_close_btn');
            const popupOverlay = document.querySelectorAll('.popup_overlay');
        
            openPopupBtn.forEach(btn => {
                btn.addEventListener('click', function() {
                    
                    const targetId = btn.dataset.popup
                    const popup = document.querySelector(`.popup_overlay#${targetId}`);
                    if (!popup) return;
                    popup.classList.add('show');
                    document.querySelector('html').classList.add('overflow-hidden')
                });
            })
        
            closePopupBtn.forEach(el => {
                el.addEventListener('click', function() {
                    el.closest('.popup_overlay').classList.remove('show');
                    document.querySelector('html').classList.remove('overflow-hidden')
                });
            })
        
            popupOverlay.forEach(element => {
                element.addEventListener('click', function(event) {
                    if (event.target === element) {
                        popupOverlay.forEach(el => {
                            el.classList.remove('show');
                        })
                        document.querySelector('html').classList.remove('overflow-hidden')
                    }
                });
            });

            const individualAutoPopup = document.querySelector('.popup_overlay[data-auto-open-individual]');
            if (individualAutoPopup) {
                const storageKey = individualAutoPopup.getAttribute('data-auto-open-key');
                if (storageKey && !sessionStorage.getItem(storageKey)) {
                    individualAutoPopup.classList.add('show');
                    document.documentElement.classList.add('overflow-hidden');
                    sessionStorage.setItem(storageKey, '1');
                }
            }
        });
        
    }
})();
// toggle popup



// toggle class in upsell item
(function () {
    const inputs = document.querySelectorAll('.product__upsell input')
  
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        const upsellItem = input.closest('.product__upsell_item')
        if (input.checked) {
          upsellItem.classList.add('active')
        } else {
          upsellItem.classList.remove('active')
        }
      })
    })
  })();
  // toggle class in upsell item

// image comparison
(function () {
    const comparisonSection = document.querySelector('.comparison');

    if (!comparisonSection) return;

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                observer.unobserve(comparisonSection);
                initComparison();
            }
        });
    }, { threshold: 0.2 });

    observer.observe(comparisonSection);

    function initComparison() {
        let commonProgress = 0.5;
        const blocks = document.querySelectorAll('.comparison__block');

        const isElementInViewport = (el) => {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
        };

        blocks.forEach(block => {
          const divisor = block.querySelector(".comparison__before"),
                slider = block.querySelector(".comparison__range");
          let animationFrame;
          let direction = 1;
          let isInteracted = false;
          let progress = 0.5;
          let lastTime = performance.now();
          const speed = 0.0004;

          const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

          const moveDivisor = () => { 
            divisor.style.width = slider.value + "%";
          };

          const animateSlider = (timestamp) => {
            if (isInteracted || !isElementInViewport(block)) {
              cancelAnimationFrame(animationFrame);
              animationFrame = null;
              return;
            }
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            progress += (speed * deltaTime) * direction;
            if (progress >= 1) {
              progress = 1;
              direction = -1;
            } else if (progress <= 0) {
              progress = 0;
              direction = 1;
            }
            const value = 10 + easeInOut(progress) * 80;
            slider.value = value;
            moveDivisor();
            commonProgress = progress;
            animationFrame = requestAnimationFrame(animateSlider);
          };

          slider.addEventListener('input', () => {
            isInteracted = true;
            moveDivisor();
            cancelAnimationFrame(animationFrame);
          });

          slider.addEventListener('mouseup', () => {
            isInteracted = false;
            progress = commonProgress;
            lastTime = performance.now();
            animateSlider(lastTime);
          });

          slider.addEventListener('touchend', () => {
            isInteracted = false;
            progress = commonProgress;
            lastTime = performance.now();
            animateSlider(lastTime);
          });

          slider.addEventListener('touchstart', () => {
            isInteracted = true;
            cancelAnimationFrame(animationFrame);
          });

          slider.addEventListener('touchmove', () => {
            isInteracted = true;
            cancelAnimationFrame(animationFrame);
          });

          window.addEventListener('scroll', () => {
            if (!isInteracted && isElementInViewport(block) && !animationFrame) {
              lastTime = performance.now();
              animateSlider(lastTime);
            }
          }, { passive: true });

          animateSlider(lastTime);
        });

        document.querySelectorAll('.comparison__range').forEach(rangeInput => {
            rangeInput.addEventListener('touchstart', function(e) {
                e.preventDefault();
                const touch = e.targetTouches[0];
                const value = Math.round((touch.pageX - this.getBoundingClientRect().left) / this.offsetWidth * 100);
                this.value = value;
                const event = new Event('input', { bubbles: true });
                this.dispatchEvent(event);
            });

            rangeInput.addEventListener('touchmove', function(e) {
                e.preventDefault();
                const touch = e.targetTouches[0];
                const value = Math.round((touch.pageX - this.getBoundingClientRect().left) / this.offsetWidth * 100);
                this.value = value;
                const event = new Event('input', { bubbles: true });
                this.dispatchEvent(event);
            });
        });

        const container = document.querySelector(".comparison__wrapper");
        const scrollbar = document.querySelector(".comparison__scrollbar");
        const thumb = document.querySelector(".comparison__scrollbar-thumb");

        if (container && scrollbar && thumb) {
        const updateThumb = () => {
            const scrollableWidth = container.scrollWidth - container.clientWidth;
            if (scrollableWidth <= 0) return;
            const scrollRatio = container.scrollLeft / scrollableWidth;
            const maxThumbMove = scrollbar.clientWidth - thumb.clientWidth;
            thumb.style.transform = `translateX(${scrollRatio * maxThumbMove}px)`;
        };

        const moveScrollbar = (clientX) => {
            const rect = scrollbar.getBoundingClientRect();
            const offsetX = clientX - rect.left;
            const clickRatio = offsetX / scrollbar.clientWidth;
            const scrollableWidth = container.scrollWidth - container.clientWidth;
            if (scrollableWidth <= 0) return;
            container.scrollLeft = clickRatio * scrollableWidth;
            updateThumb();
        };

        let isDragging = false;
        let dragStartX = 0;
        let initialScrollLeft = 0;

        const startDrag = (clientX) => {
            isDragging = true;
            dragStartX = clientX;
            initialScrollLeft = container.scrollLeft;
        };

        const duringDrag = (clientX) => {
            if (!isDragging) return;
            const deltaX = clientX - dragStartX;
            const scrollbarWidth = scrollbar.clientWidth - thumb.clientWidth;
            const scrollableWidth = container.scrollWidth - container.clientWidth;
            if (scrollbarWidth <= 0 || scrollableWidth <= 0) return;
            const scrollDelta = deltaX * (scrollableWidth / scrollbarWidth);
            container.scrollLeft = initialScrollLeft + scrollDelta;
            updateThumb();
        };

        const endDrag = () => {
            isDragging = false;
        };

        thumb.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            thumb.style.cursor = "grabbing";
            startDrag(e.clientX);
        });
        document.addEventListener("mousemove", (e) => {
            duringDrag(e.clientX);
        });
        document.addEventListener("mouseup", () => {
            thumb.style.cursor = "grab";
            endDrag();
        });

        thumb.addEventListener("touchstart", (e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            startDrag(touch.clientX);
        });
        thumb.addEventListener("touchmove", (e) => {
            const touch = e.touches[0];
            duringDrag(touch.clientX);
            e.preventDefault();
        });
        thumb.addEventListener("touchend", endDrag);

        scrollbar.addEventListener("mousedown", (e) => {
            if (e.target !== thumb) {
            moveScrollbar(e.clientX);
            }
        });
        scrollbar.addEventListener("touchstart", (e) => {
            if (e.target !== thumb) {
            const touch = e.touches[0];
            moveScrollbar(touch.clientX);
            }
        });

        container.addEventListener("scroll", updateThumb, { passive: true });
        updateThumb();
        }
    }
})();

// image comparison

// close bitrix24
(function () {
    window.addEventListener('load', () => {

        setTimeout(() => {
            const closeBtn = document.querySelector('.b24-widget-button-popup-btn-hide')
            if (!closeBtn) return;
            closeBtn.click()
        }, 5000);
    })
})();
// close bitrix24  

// cart toast
(function () {
  let cartToastTimeout;
  let cartToastDelayTimeout;

  const toastSelector = '.cart__toast';
  const closeBtnSelector = '.cart__toast_close';
  const visibleClass = 'cart__toast--visible';
  const sessionKey = 'cart_toast_closed';

  function showCartToast() {
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }

    const toast = document.querySelector(toastSelector);
    if (!toast) {
      return;
    }

    // Показываем
    toast.classList.add(visibleClass);

    // Скрываем через 10 секунд
    cartToastTimeout = setTimeout(() => {
      hideCartToast();

      // Повторно показать через 15 секунд
      cartToastDelayTimeout = setTimeout(showCartToast, 15000);
    }, 10000);
  }

  function hideCartToast() {
    const toast = document.querySelector(toastSelector);
    if (!toast) return;
    toast.classList.remove(visibleClass);
  }

  function handleManualClose() {
    sessionStorage.setItem(sessionKey, 'true');
    hideCartToast();
    clearTimeout(cartToastTimeout);
    clearTimeout(cartToastDelayTimeout);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const closeBtn = document.querySelector(closeBtnSelector);
    if (closeBtn) {
      closeBtn.addEventListener('click', handleManualClose);
    }

    setTimeout(() => {
      showCartToast();
    }, 2000);
  });
})();
// cart toast

// product options hover on mobile
(function () {
document.addEventListener('DOMContentLoaded', function () {
  const touchImages = document.querySelectorAll('.default_option img, .lip__item img');

  touchImages.forEach(img => {
    img.addEventListener('touchstart', () => {
      img.classList.add('tapped');

      setTimeout(() => {
        img.classList.remove('tapped');
      }, 1000);
    });
  });
});
})();
// product options hover on mobile

// Cart upsell progress carousel
(function () {
  function initAllCartUpsells() {
    document.querySelectorAll('.drawer__progress_products').forEach(function (root) {
      if (window.initDrawerProgressUpsell) window.initDrawerProgressUpsell(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCartUpsells);
  } else {
    initAllCartUpsells();
  }
})();

// toggle header car dropdown
(function () {
    document.addEventListener("click", function(e) {
        const trigger = e.target.closest(".header__car");
        const allDropdowns = document.querySelectorAll(".header__car_dropdown");

        // Клик по кнопке (открыть/закрыть)
        if (trigger) {
            const dropdown = trigger.nextElementSibling;
            if (!dropdown || !dropdown.classList.contains('header__car_dropdown')) {
                return;
            }

            // Закрываем все остальные
            allDropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove("active");
            });

            // Тогглим текущий
            dropdown.classList.toggle("active");
            return;
        }

        // Клик вне любых дропдаунов (закрыть всё)
        if (!e.target.closest(".header__car_dropdown")) {
            allDropdowns.forEach(d => d.classList.remove("active"));
        }
    });
})();
// toggle header car dropdown