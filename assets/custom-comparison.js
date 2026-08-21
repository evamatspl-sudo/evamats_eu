(function () {
  const SELECTOR = ".comparison";

  function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function initComparisonSection(section) {
    if (!section || section.dataset.evamatsComparisonBound === "true") return;
    section.dataset.evamatsComparisonBound = "true";

    let commonProgress = 0.5;
    const blocks = section.querySelectorAll(".comparison__block");

    blocks.forEach((block) => {
      const divisor = block.querySelector(".comparison__before");
      const slider = block.querySelector(".comparison__range");
      if (!divisor || !slider) return;

      let animationFrame = null;
      let direction = 1;
      let isInteracted = false;
      let progress = 0.5;
      let lastTime = performance.now();
      const speed = 0.0004;

      const easeInOut = (value) =>
        value < 0.5
          ? 2 * value * value
          : -1 + (4 - 2 * value) * value;

      const moveDivisor = () => {
        divisor.style.width = `${slider.value}%`;
      };

      const animateSlider = (timestamp) => {
        if (isInteracted || !isElementInViewport(block)) {
          if (animationFrame) cancelAnimationFrame(animationFrame);
          animationFrame = null;
          return;
        }

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        progress += speed * deltaTime * direction;

        if (progress >= 1) {
          progress = 1;
          direction = -1;
        } else if (progress <= 0) {
          progress = 0;
          direction = 1;
        }

        slider.value = 10 + easeInOut(progress) * 80;
        moveDivisor();
        commonProgress = progress;
        animationFrame = requestAnimationFrame(animateSlider);
      };

      const pause = () => {
        isInteracted = true;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = null;
      };

      const resume = () => {
        isInteracted = false;
        progress = commonProgress;
        lastTime = performance.now();
        if (!animationFrame) animationFrame = requestAnimationFrame(animateSlider);
      };

      const setValueFromTouch = (event) => {
        if (!event.touches.length) return;
        const rect = slider.getBoundingClientRect();
        const value = Math.max(
          0,
          Math.min(100, ((event.touches[0].clientX - rect.left) / rect.width) * 100),
        );
        slider.value = Math.round(value);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      };

      slider.addEventListener("input", () => {
        pause();
        moveDivisor();
      });
      slider.addEventListener("mousedown", pause);
      slider.addEventListener("mouseup", resume);
      slider.addEventListener("change", resume);
      slider.addEventListener(
        "touchstart",
        (event) => {
          pause();
          setValueFromTouch(event);
        },
        { passive: true },
      );
      slider.addEventListener(
        "touchmove",
        (event) => {
          pause();
          setValueFromTouch(event);
        },
        { passive: true },
      );
      slider.addEventListener("touchend", resume);

      window.addEventListener(
        "scroll",
        () => {
          if (!isInteracted && isElementInViewport(block) && !animationFrame) {
            lastTime = performance.now();
            animationFrame = requestAnimationFrame(animateSlider);
          }
        },
        { passive: true },
      );

      moveDivisor();
      animationFrame = requestAnimationFrame(animateSlider);
    });

    const container = section.querySelector(".comparison__wrapper");
    const scrollbar = section.querySelector(".comparison__scrollbar");
    const thumb = section.querySelector(".comparison__scrollbar-thumb");
    if (!container || !scrollbar || !thumb) return;

    const updateThumb = () => {
      const scrollableWidth = container.scrollWidth - container.clientWidth;
      if (scrollableWidth <= 0) {
        thumb.style.transform = "translateX(0)";
        return;
      }
      const scrollRatio = container.scrollLeft / scrollableWidth;
      const maxThumbMove = Math.max(0, scrollbar.clientWidth - thumb.clientWidth);
      thumb.style.transform = `translateX(${scrollRatio * maxThumbMove}px)`;
    };

    const moveScrollbar = (clientX) => {
      const rect = scrollbar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      container.scrollLeft = ratio * (container.scrollWidth - container.clientWidth);
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
      const scrollbarWidth = scrollbar.clientWidth - thumb.clientWidth;
      const scrollableWidth = container.scrollWidth - container.clientWidth;
      if (scrollbarWidth <= 0 || scrollableWidth <= 0) return;
      container.scrollLeft =
        initialScrollLeft +
        (clientX - dragStartX) * (scrollableWidth / scrollbarWidth);
      updateThumb();
    };

    const endDrag = () => {
      isDragging = false;
      thumb.style.cursor = "grab";
    };

    thumb.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      thumb.style.cursor = "grabbing";
      startDrag(event.clientX);
    });
    document.addEventListener("mousemove", (event) => duringDrag(event.clientX));
    document.addEventListener("mouseup", endDrag);
    thumb.addEventListener(
      "touchstart",
      (event) => {
        event.stopPropagation();
        if (event.touches.length) startDrag(event.touches[0].clientX);
      },
      { passive: true },
    );
    thumb.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length) duringDrag(event.touches[0].clientX);
      },
      { passive: true },
    );
    thumb.addEventListener("touchend", endDrag);
    scrollbar.addEventListener("mousedown", (event) => {
      if (event.target !== thumb) moveScrollbar(event.clientX);
    });
    scrollbar.addEventListener(
      "touchstart",
      (event) => {
        if (event.target !== thumb && event.touches.length) {
          moveScrollbar(event.touches[0].clientX);
        }
      },
      { passive: true },
    );
    container.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb, { passive: true });
    updateThumb();
  }

  function findSections(root) {
    const sections = [];
    if (root instanceof Element && root.matches(SELECTOR)) sections.push(root);
    if (root.querySelectorAll) sections.push(...root.querySelectorAll(SELECTOR));
    return sections;
  }

  function initComparisons(root) {
    findSections(root).forEach((section) => {
      if (section.dataset.evamatsComparisonBound === "true") return;

      if (!("IntersectionObserver" in window)) {
        initComparisonSection(section);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            initComparisonSection(entry.target);
          });
        },
        { threshold: 0.05 },
      );
      observer.observe(section);
    });
  }

  const boot = () => initComparisons(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener("pageshow", boot);
  document.addEventListener("shopify:section:load", (event) => {
    initComparisons(event.target);
  });
})();
