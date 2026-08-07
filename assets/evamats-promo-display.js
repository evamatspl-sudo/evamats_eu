/*
  Показ активной акции на странице конфигуратора: перечёркнутая цена + новая + бейдж «−N %».

  Зачем отдельный модуль: скидка в Shopify автоматическая, она существует только для позиций
  в корзине. На странице товара Shopify про неё ничего не знает, поэтому её приходится
  считать на стороне витрины — ровно так же это делают и приложения скидок.

  Пороги приходят из метаобъекта `carvion_promo_band` через snippets/evamats-promo-config.liquid.
  Правятся в админке, без выкладки темы. Они обязаны совпадать с настоящей скидкой в Shopify:
  здесь рисуется только обещание, деньги списывает скидка. Полосу выключить — снять `active`
  у записи метаобъекта, и блок сам перестанет рисоваться.
*/
(function () {
  'use strict';

  var cfgEl = document.getElementById('evamats-promo-config');
  if (!cfgEl) return;

  var cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (e) {
    return;
  }
  if (!cfg || cfg.active !== true || !Array.isArray(cfg.bands) || !cfg.bands.length) return;
  if (cfg.ends_at && Date.now() > Date.parse(cfg.ends_at)) return;

  var rate = parseFloat(((window.Shopify || {}).currency || {}).rate || '1') || 1;
  var locale = document.documentElement.lang || undefined;
  var busy = false;

  /* цены со всеми ценниками показа: липкая панель снизу И карточка итога у кнопки «в корзину».
     У обеих внутри лежат .sticky_config_price_price и .evamats-sticky-card__discount —
     разметка одинаковая, отличается только имя строки-обёртки. */
  var PRICE_ROWS = '.evamats-config-step-bar__price-row, .evamats-config-checkout__total-row';

  /* цена варианта приходит в валюте витрины, пороги заданы в евро */
  function bandFor(cents) {
    var base = cents / 100 / rate;
    var now = Date.now();
    var best = null;

    for (var i = 0; i < cfg.bands.length; i++) {
      var b = cfg.bands[i];
      if (base < b.min) continue;
      if (b.max != null && base > b.max) continue;
      if (b.starts_at && now < Date.parse(b.starts_at)) continue;
      if (b.ends_at && now > Date.parse(b.ends_at)) continue;
      /* если полосы пересекаются — выигрывает большая скидка.
         Так же поступает и сам Shopify: проверено 07.08.2026, на 198 € подходили
         обе полосы (20 % и 25 %), применилась 25 %, а не сумма. */
      if (!best || b.percent > best.percent) best = b;
    }
    return best;
  }

  function currencyOf(sample) {
    return String(sample || '').replace(/[\d.,\s  -]/g, '').trim();
  }

  function money(cents, sample) {
    /* формат берём с самой витрины: если цены показаны без копеек — округляем так же */
    var showsDecimals = /[.,]\d/.test(String(sample || ''));
    var num = (Number(cents) / 100).toLocaleString(locale, {
      minimumFractionDigits: showsDecimals ? 2 : 0,
      maximumFractionDigits: showsDecimals ? 2 : 0
    });
    var cur = currencyOf(sample);
    return cur ? num + ' ' + cur : num;
  }

  function discounted(cents, band) {
    return Math.round(cents * (100 - band.percent) / 100);
  }

  function badgeText(band) {
    return '−' + band.percent + ' %';
  }

  /* ---------- варианты ---------- */

  function variantContext() {
    var vr = document.querySelector('variant-radios');
    if (!vr) return null;
    var script = vr.querySelector('script[type="application/json"]');
    if (!script) return null;

    var list;
    try {
      list = JSON.parse(script.textContent);
    } catch (e) {
      return null;
    }

    var names = [];
    vr.querySelectorAll('fieldset.js.product-form__input').forEach(function (fs) {
      var input = fs.querySelector('input[type="radio"]');
      if (input && input.name && names.indexOf(input.name) === -1) names.push(input.name);
    });

    var selected = {};
    names.forEach(function (name) {
      var checked = vr.querySelector('input[type="radio"][name="' + CSS.escape(name) + '"]:checked');
      if (checked) selected[name] = checked.value;
    });

    return { list: list, names: names, selected: selected };
  }

  function findVariant(ctx, valuesByName) {
    return ctx.list.find(function (variant) {
      return ctx.names.every(function (name, idx) {
        var val = valuesByName[name];
        if (val == null || val === '') return true;
        return variant['option' + (idx + 1)] === val;
      });
    });
  }

  /* ---------- наборы ковриков ---------- */

  function clearOption(label) {
    label.classList.remove('eva-promo-on');
    var extra = label.querySelector('.eva-promo');
    if (extra) extra.remove();
  }

  function renderOptions(ctx, sample) {
    var field = document.querySelector('.evamats-config fieldset[data-name="mats_set"]');
    if (!field) return;

    field.querySelectorAll('input[type="radio"]').forEach(function (input) {
      var label = document.querySelector('label[for="' + input.id + '"]');
      if (!label) return;

      var priceEl = label.querySelector('.label__tooltip');
      if (!priceEl) return;

      var values = Object.assign({}, ctx.selected);
      values[input.name] = input.value;
      var variant = findVariant(ctx, values);
      if (!variant || variant.price == null) return clearOption(label);

      var band = bandFor(variant.price);
      if (!band) return clearOption(label);

      var box = label.querySelector('.eva-promo');
      if (!box) {
        box = document.createElement('span');
        box.className = 'eva-promo';
        box.innerHTML = '<span class="eva-promo__new"></span><span class="eva-promo__badge"></span>';
        priceEl.insertAdjacentElement('afterend', box);
      }
      box.querySelector('.eva-promo__new').textContent = money(discounted(variant.price, band), sample);
      box.querySelector('.eva-promo__badge').textContent = badgeText(band);
      label.classList.add('eva-promo-on');
    });
  }

  /* ---------- ценники: липкая панель снизу и карточка итога ---------- */

  function renderStickyBars(ctx) {
    var current = findVariant(ctx, ctx.selected);

    document.querySelectorAll(PRICE_ROWS).forEach(function (row) {
      var priceEl = row.querySelector('.sticky_config_price_price');
      if (!priceEl) return;

      var badgeEl = row.querySelector('.evamats-sticky-card__discount');
      var band = current && current.price != null ? bandFor(current.price) : null;
      var box = row.querySelector('.eva-promo-sticky');

      if (!band) {
        row.classList.remove('eva-promo-on');
        if (box) box.remove();
        if (badgeEl) {
          badgeEl.textContent = '';
          badgeEl.classList.add('hidden');
        }
        return;
      }

      if (!box) {
        box = document.createElement('span');
        box.className = 'eva-promo-sticky';
        priceEl.insertAdjacentElement('afterend', box);
      }
      box.textContent = money(discounted(current.price, band), priceEl.textContent);
      row.classList.add('eva-promo-on');

      if (badgeEl) {
        badgeEl.textContent = badgeText(band);
        badgeEl.classList.remove('hidden');
      }
    });
  }

  /* ---------- запуск ---------- */

  function render() {
    if (busy) return;
    var ctx = variantContext();
    if (!ctx) return;

    busy = true;
    try {
      var sample =
        (document.querySelector('.sticky_config_price_price') || {}).textContent ||
        (document.querySelector('.label__tooltip') || {}).textContent ||
        '';
      renderOptions(ctx, sample);
      renderStickyBars(ctx);
    } finally {
      /* снимаем флаг после того, как отработают наши же мутации */
      setTimeout(function () {
        busy = false;
      }, 0);
    }
  }

  var pending = null;
  function schedule() {
    clearTimeout(pending);
    pending = setTimeout(render, 60);
  }

  function boot() {
    render();

    document.addEventListener('change', function (event) {
      if (event.target && event.target.closest && event.target.closest('variant-radios')) schedule();
    });
    document.addEventListener('variant:change', schedule);

    /* цены наборов перерисовывает product-config.js — подхватываем и дополняем */
    var field = document.querySelector('.evamats-config fieldset[data-name="mats_set"]');
    if (field && window.MutationObserver) {
      new MutationObserver(function () {
        if (!busy) schedule();
      }).observe(field, { childList: true, characterData: true, subtree: true });
    }

    document.querySelectorAll('.sticky_config_price_price').forEach(function (el) {
      if (!window.MutationObserver) return;
      new MutationObserver(function () {
        if (!busy) schedule();
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    setTimeout(render, 600);
    setTimeout(render, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
