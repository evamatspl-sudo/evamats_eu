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

            var slide = null;
            if (full) {
                slide = slider.slides[slider.activeIndex];
            } else {
                var containerRect = slider.el.getBoundingClientRect();
                var midX = containerRect.left + containerRect.width / 2;
                var bestDist = Infinity;
                slider.slides.forEach(function (candidate) {
                    if (candidate.classList.contains('swiper-slide-duplicate-invisible')) return;
                    var rect = candidate.getBoundingClientRect();
                    if (rect.width < 1) return;
                    var centerX = rect.left + rect.width / 2;
                    var dist = Math.abs(centerX - midX);
                    if (dist < bestDist) {
                        bestDist = dist;
                        slide = candidate;
                    }
                });
                if (!slide) slide = slider.slides[slider.activeIndex];
            }
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

        // Few slides + high slidesPerView breaks Swiper loop (empty gaps / shuffle).
        // Duplicate slides in DOM and use rewind instead of loop.
        var mainWrapper = mainEl.querySelector('.swiper-wrapper');
        var originalSlides = mainWrapper
            ? Array.prototype.slice.call(mainWrapper.children)
            : [];
        var originalCount = originalSlides.length;
        if (mainWrapper && originalCount > 0) {
            originalSlides.forEach(function (slide, index) {
                slide.setAttribute('data-video-index', String(index));
            });
            var minSlides = Math.max(12, Math.ceil(4.2 * 3));
            var pass = 0;
            while (mainWrapper.children.length < minSlides && pass < 4) {
                originalSlides.forEach(function (slide) {
                    if (mainWrapper.children.length >= minSlides) return;
                    var clone = slide.cloneNode(true);
                    clone.removeAttribute('id');
                    mainWrapper.appendChild(clone);
                });
                pass += 1;
            }
        }

        var mainOpts = {
            loop: originalCount > 1,
            rewind: false,
            slidesPerView: 1.55,
            spaceBetween: 4,
            speed: 480,
            watchOverflow: true,
            centeredSlides: true,
            loopAdditionalSlides: 2,
            breakpoints: {
                750: {
                    slidesPerView: 4.2,
                    spaceBetween: 4,
                    centeredSlides: true,
                },
            },
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            on: {
                transitionEnd: function () {
                    videoPlay(this);
                },
                click: function () {
                    var clicked = this.clickedSlide;
                    if (!clicked) return;
                    var videoIndexAttr = clicked.getAttribute('data-video-index');
                    var slideRealIndex =
                        videoIndexAttr !== null && videoIndexAttr !== ''
                            ? parseInt(videoIndexAttr, 10)
                            : NaN;
                    if (isNaN(slideRealIndex)) {
                        slideRealIndex = typeof this.realIndex === 'number' ? this.realIndex : 0;
                    }
                    slideRealIndex = slideRealIndex % Math.max(originalCount, 1);

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
