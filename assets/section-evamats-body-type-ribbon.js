/* Фильтр товаров модели по типу кузова. Ничего никуда не ведёт — прячет/показывает карточки на месте. */
(function () {
  'use strict';

  function init(section) {
    if (section.dataset.evaBodyReady === '1') return;
    section.dataset.evaBodyReady = '1';

    var mapEl = section.querySelector('[data-eva-body-map]');
    var chips = Array.prototype.slice.call(section.querySelectorAll('.eva-body-chip'));
    var emptyEl = section.querySelector('[data-eva-body-empty]');
    if (!mapEl || !chips.length) return;

    var map = {};
    try {
      map = JSON.parse(mapEl.textContent || '{}') || {};
    } catch (e) {
      return; // карта битая — оставляем страницу как есть, ничего не ломаем
    }

    var grid = document.getElementById('product-grid');
    if (!grid) return;

    function items() {
      return Array.prototype.slice.call(grid.querySelectorAll('li.grid__item'));
    }

    function handleOf(item) {
      var link = item.querySelector('a[href*="/products/"]');
      if (!link) return null;
      var m = link.getAttribute('href').match(/\/products\/([^/?#]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }

    function apply(body) {
      var shown = 0;
      items().forEach(function (item) {
        var h = handleOf(item);
        var itemBody = h && Object.prototype.hasOwnProperty.call(map, h) ? String(map[h] || '') : '';
        var itemKeys = itemBody ? itemBody.split(',') : [];
        var visible = !body || itemKeys.indexOf(body) !== -1;
        item.hidden = !visible;
        item.style.display = visible ? '' : 'none';
        if (visible) shown++;
      });

      chips.forEach(function (chip) {
        var active = (chip.dataset.body || '') === (body || '');
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (emptyEl) emptyEl.hidden = shown !== 0;

      // Полоса «Máme na všechny typy karoserie» осмысленна только без фильтра:
      // когда кузов уже выбран, она сбивает с толку — прячем.
      document.querySelectorAll('[data-eva-bodybar]').forEach(function (bar) {
        bar.style.display = body ? 'none' : '';
      });

      try {
        var url = new URL(window.location.href);
        if (body) url.searchParams.set('body', body);
        else url.searchParams.delete('body');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {
        /* URL API недоступен — фильтр всё равно работает */
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        apply(chip.dataset.body || '');
      });
    });

    // восстановление состояния из ?body=
    var initial = '';
    try {
      initial = new URL(window.location.href).searchParams.get('body') || '';
    } catch (e) {
      initial = '';
    }
    if (initial && chips.some(function (c) { return (c.dataset.body || '') === initial; })) {
      apply(initial);
    }
  }

  function boot() {
    document.querySelectorAll('[data-eva-body-ribbon]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // перерисовка секции в редакторе темы
  document.addEventListener('shopify:section:load', boot);
})();
