/** Display-only: strip brand tokens from variant option labels (catalog values stay unchanged). */
window.evamatsStripBrandLabel = function (value) {
  return String(value || '')
    .replace(/\s*(?:EVAMATS|Carvion)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/** Lazy-load Fancybox CSS+JS once (product gallery, page gallery, reviews). */
window.ensureFancyboxLoaded = function () {
  if (window.Fancybox) {
    return Promise.resolve(window.Fancybox);
  }
  if (window.__evamatsFancyboxReady) {
    return window.__evamatsFancyboxReady;
  }

  var assets = window.evamatsAssets || {};
  var cssUrl = assets.fancyboxCss;
  var jsUrl = assets.fancyboxJs;
  if (!jsUrl) {
    return Promise.reject(new Error('Fancybox asset URL missing'));
  }

  window.__evamatsFancyboxReady = new Promise(function (resolve, reject) {
    if (cssUrl && !document.querySelector('link[data-evamats-fancybox-css]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      link.setAttribute('data-evamats-fancybox-css', '1');
      document.head.appendChild(link);
    }

    var existing = document.querySelector('script[data-evamats-fancybox-js]');
    if (existing) {
      existing.addEventListener('load', function () {
        resolve(window.Fancybox);
      });
      existing.addEventListener('error', reject);
      return;
    }

    var script = document.createElement('script');
    script.src = jsUrl;
    script.setAttribute('data-evamats-fancybox-js', '1');
    script.onload = function () {
      resolve(window.Fancybox);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__evamatsFancyboxReady;
};

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

// toggle popup
(function () {
    var POPUP_HISTORY_KEY = 'evamatsPopupOverlay';

    function ensureProductConfigLoaded() {
        if (window.__evamatsProductConfigInitialized) {
            return Promise.resolve();
        }
        if (document.querySelector('script[src*="product-config.js"]')) {
            if (window.__evamatsProductConfigReady) {
                return window.__evamatsProductConfigReady;
            }
            return Promise.resolve();
        }
        const url = window.evamatsAssets && window.evamatsAssets.productConfig;
        if (!url) return Promise.resolve();

        window.__evamatsProductConfigReady = new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = url;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return window.__evamatsProductConfigReady;
    }

    function stopMediaInOverlay(overlay) {
        if (!overlay) return;

        overlay.querySelectorAll('video, audio').forEach(function (media) {
            try {
                media.pause();
            } catch (e) {}
            try {
                if (media.readyState > 0) {
                    media.currentTime = 0;
                }
            } catch (e) {}
            try {
                // Abort current playback buffer / network fetch
                media.load();
            } catch (e) {}
        });

        // YouTube / Vimeo / generic embeds: blank src to stop playback and loading
        overlay.querySelectorAll('iframe').forEach(function (iframe) {
            var src = iframe.getAttribute('src');
            if (!src || src === 'about:blank') return;
            if (!iframe.dataset.evamatsSrc) {
                iframe.dataset.evamatsSrc = src;
            }
            iframe.setAttribute('src', 'about:blank');
        });
    }

    function restoreMediaInOverlay(overlay) {
        if (!overlay) return;
        overlay.querySelectorAll('iframe').forEach(function (iframe) {
            if (iframe.dataset.evamatsSrc && (!iframe.getAttribute('src') || iframe.getAttribute('src') === 'about:blank')) {
                iframe.setAttribute('src', iframe.dataset.evamatsSrc);
            }
        });
    }

    function rememberMediaSources(overlay) {
        if (!overlay) return;
        overlay.querySelectorAll('iframe').forEach(function (iframe) {
            var src = iframe.getAttribute('src');
            if (src && src !== 'about:blank' && !iframe.dataset.evamatsSrc) {
                iframe.dataset.evamatsSrc = src;
            }
        });
    }

    function pushPopupHistory(overlay) {
        if (!overlay || !window.history || !window.history.pushState) return;
        if (overlay.dataset.evamatsHistory === '1') return;
        try {
            window.history.pushState({ [POPUP_HISTORY_KEY]: overlay.id || true }, '');
            overlay.dataset.evamatsHistory = '1';
        } catch (e) {}
    }

    function clearPopupHistoryFlag(overlay) {
        if (overlay) overlay.dataset.evamatsHistory = '';
    }

    function openPopupFromTrigger(btn) {
        const targetId = btn.dataset.popup;
        if (!targetId) return;
        const popup = document.getElementById(targetId);
        if (!popup || !popup.classList.contains('popup_overlay')) return;

        rememberMediaSources(popup);
        restoreMediaInOverlay(popup);

        if (targetId === 'popupOverlayApplicationForm') {
            ensureProductConfigLoaded().then(function () {
                popup.classList.add('show');
                document.documentElement.classList.add('overflow-hidden');
                pushPopupHistory(popup);
            });
            return;
        }

        popup.classList.add('show');
        document.documentElement.classList.add('overflow-hidden');
        pushPopupHistory(popup);
    }

    function closePopupOverlay(overlay, options) {
        if (!overlay) return;
        var opts = options || {};
        stopMediaInOverlay(overlay);
        overlay.classList.remove('show');
        clearPopupHistoryFlag(overlay);
        if (!document.querySelector('.popup_overlay.show')) {
            document.documentElement.classList.remove('overflow-hidden');
        }
        // Browser back already consumed the history entry — don't call history.back()
        if (!opts.fromPopstate && opts.useHistoryBack !== false) {
            // no-op: we leave the extra history entry; next back goes to previous page.
            // Prefer replacing so back doesn't re-open nothing: if we pushed, go back once.
            if (window.history.state && window.history.state[POPUP_HISTORY_KEY]) {
                try {
                    window.history.back();
                } catch (e) {}
            }
        }
    }

    function closeTopmostPopup(options) {
        var open = document.querySelectorAll('.popup_overlay.show');
        if (!open.length) return false;
        closePopupOverlay(open[open.length - 1], options);
        return true;
    }

    function initPopups() {
        document.addEventListener('click', function (event) {
            const openBtn = event.target.closest('.openPopup');
            if (openBtn) {
                event.stopPropagation();
                openPopupFromTrigger(openBtn);
                return;
            }

            const closeBtn = event.target.closest('.popup_close_btn');
            if (closeBtn) {
                closePopupOverlay(closeBtn.closest('.popup_overlay'));
                return;
            }

            if (event.target.classList && event.target.classList.contains('popup_overlay')) {
                closePopupOverlay(event.target);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' && event.code !== 'Escape') return;
            if (closeTopmostPopup()) {
                event.preventDefault();
            }
        });

        window.addEventListener('popstate', function () {
            var open = document.querySelector('.popup_overlay.show[data-evamats-history="1"]');
            if (open) {
                closePopupOverlay(open, { fromPopstate: true });
            }
        });

        // Mobile swipe-down on backdrop / popup shell (upsell video and similar overlays)
        var touchStartY = null;
        var touchTarget = null;
        document.addEventListener(
            'touchstart',
            function (event) {
                var overlay = event.target.closest('.popup_overlay.show');
                if (!overlay) return;
                // Only start swipe-close from overlay backdrop or close-adjacent chrome, not deep scrollable content mid-scroll
                if (event.target !== overlay && !event.target.classList.contains('popup_close_btn')) {
                    var scrollable = event.target.closest('.popup, .popup-content');
                    if (scrollable && scrollable.scrollTop > 0) return;
                }
                touchStartY = event.touches[0].clientY;
                touchTarget = overlay;
            },
            { passive: true }
        );
        document.addEventListener(
            'touchend',
            function (event) {
                if (touchStartY == null || !touchTarget) return;
                var endY = event.changedTouches[0].clientY;
                var delta = endY - touchStartY;
                var overlay = touchTarget;
                touchStartY = null;
                touchTarget = null;
                if (delta > 80 && overlay.classList.contains('show')) {
                    closePopupOverlay(overlay);
                }
            },
            { passive: true }
        );

        const individualAutoPopup = document.querySelector('.popup_overlay[data-auto-open-individual]');
        if (individualAutoPopup) {
            const storageKey = individualAutoPopup.getAttribute('data-auto-open-key');
            if (storageKey && !sessionStorage.getItem(storageKey)) {
                rememberMediaSources(individualAutoPopup);
                individualAutoPopup.classList.add('show');
                document.documentElement.classList.add('overflow-hidden');
                pushPopupHistory(individualAutoPopup);
                sessionStorage.setItem(storageKey, '1');
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPopups);
    } else {
        initPopups();
    }
})();
// toggle popup

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
    function syncHeaderCarFromStorage() {
        var headerCars = document.querySelectorAll('.header__car');
        if (!headerCars.length) return;

        var hasData = false;

        try {
            var saved = localStorage.getItem('carFilterSelections');
            if (saved) {
                var data = JSON.parse(saved);
                hasData = !!(
                    (data.brand || '').trim() ||
                    (data.model || '').trim() ||
                    (data.years || '').trim()
                );
            }
        } catch (error) {
            console.error('Error parsing localStorage for header__car:', error);
        }

        headerCars.forEach(function (headerCar) {
            headerCar.classList.toggle('active', hasData);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncHeaderCarFromStorage);
    } else {
        syncHeaderCarFromStorage();
    }

    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('.header__car');
        const allDropdowns = document.querySelectorAll('.header__car_dropdown');

        if (trigger) {
            e.preventDefault();
            const dropdown = trigger.nextElementSibling;
            if (!dropdown || !dropdown.classList.contains('header__car_dropdown')) {
                return;
            }

            allDropdowns.forEach(function (d) {
                if (d !== dropdown) d.classList.remove('active');
            });

            dropdown.classList.toggle('active');
            return;
        }

        if (!e.target.closest('.header__car_dropdown')) {
            allDropdowns.forEach(function (d) {
                d.classList.remove('active');
            });
        }
    });
})();
// toggle header car dropdown

/** Consent checkbox gate: mat-consult-form and other forms using data-consent-gate* */
(function () {
    var DEFAULT_MSG = 'You must accept the privacy policy and terms of service.';

    function getGateRoot(el) {
        var root = el.closest('[data-consent-gate]');
        if (root) return root;
        var form = el.closest('form');
        return form ? form.querySelector('[data-consent-gate]') : null;
    }

    function validateConsentGate(root) {
        var checkbox = root.querySelector('[data-consent-gate-checkbox]');
        var output = root.querySelector('[data-consent-gate-output]');
        if (!checkbox || !output) return true;

        if (!checkbox.checked) {
            var msg = root.getAttribute('data-consent-gate-msg');
            output.textContent = msg && String(msg).trim() ? String(msg).trim() : DEFAULT_MSG;
            output.style.display = 'block';
            return false;
        }

        output.textContent = '';
        output.style.display = 'none';
        return true;
    }

    function syncPhoneFields(form) {
        if (!form) return;
        form.querySelectorAll('[data-phone-field]').forEach(function (field) {
            var codeEl = field.querySelector('[data-phone-code]');
            var localEl = field.querySelector('[data-phone-local]');
            var fullEl = field.querySelector('[data-phone-full]');
            if (!codeEl || !localEl || !fullEl) return;

            var code = String(codeEl.value || '').trim();
            var local = String(localEl.value || '').replace(/\D/g, '');
            fullEl.value = local ? code + local : '';
        });
    }

    document.addEventListener(
        'submit',
        function (e) {
            var form = e.target;
            if (!form || form.tagName !== 'FORM') return;
            syncPhoneFields(form);
            var root = form.querySelector('[data-consent-gate]');
            if (!root) return;
            if (!validateConsentGate(root)) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true
    );

    document.addEventListener(
        'click',
        function (e) {
            var submitBtn = e.target.closest('[data-consent-gate-submit]');
            if (!submitBtn) return;
            var form = submitBtn.closest('form');
            if (form) syncPhoneFields(form);
            var root = getGateRoot(submitBtn);
            if (!root) return;
            if (!validateConsentGate(root)) {
                e.preventDefault();
            }
        },
        true
    );

    document.addEventListener('change', function (e) {
        if (!e.target.matches('[data-consent-gate-checkbox]')) return;
        var root = getGateRoot(e.target);
        if (!root) return;
        if (e.target.checked) {
            validateConsentGate(root);
        }
    });
})();

(function () {
  var COOKIE_NAME = 'evamats_cart_ttl';
  var TTL_DAYS = 3;

  function getCookie(name) {
    var match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    var maxAge = days * 24 * 60 * 60;
    var expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      '; path=/; max-age=' +
      maxAge +
      '; expires=' +
      expires +
      '; SameSite=Lax';
  }

  function cartClearUrl() {
    var base = (window.routes && window.routes.cart_url) || '/cart';
    return base + '/clear.js';
  }

  function cartJsonUrl() {
    var base = (window.routes && window.routes.cart_url) || '/cart';
    return base + '.js';
  }

  function clearExpiredCart() {
    if (getCookie(COOKIE_NAME)) return;

    fetch(cartJsonUrl(), { credentials: 'same-origin' })
      .then(function (res) {
        return res.json();
      })
      .then(function (cart) {
        var hadItems = cart && cart.item_count > 0;

        if (!hadItems) {
          setCookie(COOKIE_NAME, '1', TTL_DAYS);
          return;
        }

        return fetch(cartClearUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
        }).then(function () {
          setCookie(COOKIE_NAME, '1', TTL_DAYS);
          try {
            sessionStorage.removeItem('evamatsCartTermsAccepted');
          } catch (e) {}
          window.location.reload();
        });
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearExpiredCart);
  } else {
    clearExpiredCart();
  }
})();
