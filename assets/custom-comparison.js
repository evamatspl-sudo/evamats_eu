// image comparison
(function () {
    if (window.__evamatsComparisonBound) return;
    window.__evamatsComparisonBound = true;
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
