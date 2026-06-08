(function () {
  var POLL_MS = 250;
  var MAX_WAIT_MS = 60000;

  function parseReviewCount(text) {
    if (!text) return '';
    var normalized = text.replace(/\u00a0/g, ' ').trim();
    var match = normalized.match(/([\d][\d\s,.]*[\d]|\d+)/);
    return match ? match[1].trim() : '';
  }

  function findReputonData() {
    var widgets = document.querySelectorAll('.reputon-google-reviews-widget');

    for (var i = 0; i < widgets.length; i++) {
      var widget = widgets[i];
      var ratingEl = widget.querySelector('.reputon-count-number');
      var countEl = widget.querySelector('.reputon-reviews-count');
      var rating = ratingEl ? ratingEl.textContent.trim() : '';
      var count = parseReviewCount(countEl ? countEl.textContent : '');

      if (rating && count) {
        return { rating: rating, count: count };
      }
    }

    return null;
  }

  function applyToBadge(badge, data) {
    var ratingTarget = badge.querySelector('[data-google-rating]');
    var countTarget = badge.querySelector('[data-google-review-count]');

    if (ratingTarget) ratingTarget.textContent = data.rating;
    if (countTarget) countTarget.textContent = data.count;

    badge.classList.remove('is-loading');
    badge.classList.add('is-loaded');
    badge.removeAttribute('aria-busy');
  }

  function initBadge(badge) {
    if (badge.dataset.googleBadgeInit === 'true') return;
    badge.dataset.googleBadgeInit = 'true';

    var fallbackRating = badge.getAttribute('data-fallback-rating') || '';
    var fallbackCount = badge.getAttribute('data-fallback-count') || '';
    var started = Date.now();
    var done = false;
    var observer;
    var interval;

    function finish(data) {
      if (done) return;
      done = true;
      applyToBadge(badge, data);
      if (observer) observer.disconnect();
      if (interval) clearInterval(interval);
    }

    function trySync() {
      var data = findReputonData();
      if (data) {
        finish(data);
        return true;
      }

      if (Date.now() - started >= MAX_WAIT_MS && fallbackRating && fallbackCount) {
        finish({ rating: fallbackRating, count: fallbackCount });
        return true;
      }

      return false;
    }

    badge.setAttribute('aria-busy', 'true');

    if (trySync()) return;

    observer = new MutationObserver(function () {
      trySync();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    interval = setInterval(function () {
      trySync();
    }, POLL_MS);
  }

  function init() {
    document.querySelectorAll('[data-evamats-google-badge]').forEach(initBadge);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', init);
})();
