(function () {
  document.querySelectorAll('[data-ecm]').forEach(function (root) {
    var locale = root.getAttribute('data-locale') || document.documentElement.lang || 'en';
    var currency = root.getAttribute('data-currency') || 'EUR';
    var text = {
      noResults: root.getAttribute('data-no-results') || 'No results',
      noData: root.getAttribute('data-no-data') || 'No data available',
      chooseModel: root.getAttribute('data-choose-model') || 'Choose a model…',
      chooseGeneration: root.getAttribute('data-choose-generation') || 'Choose a generation…',
      chooseBody: root.getAttribute('data-choose-body') || 'Choose a body style…',
      modelFirst: root.getAttribute('data-model-first') || 'Choose a make first',
      generationFirst: root.getAttribute('data-generation-first') || 'Choose a model first',
      bodyFirst: root.getAttribute('data-body-first') || 'Choose a generation first'
    };
    function money(cents) {
      var amount = (Number(cents) || 0) / 100;
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
          maximumFractionDigits: 2
        }).format(amount);
      } catch (e) {
        return amount.toFixed(2) + ' ' + currency;
      }
    }
    var previews = [].slice.call(root.querySelectorAll('[data-ecm-preview]'));
    var captions = [].slice.call(root.querySelectorAll('[data-ecm-preview-caption]'));
    var colorWrap = root.querySelector('[data-ecm-colors]');
    var colorProp = root.querySelector('[data-ecm-color-prop]');
    var priceEl = root.querySelector('[data-ecm-price]');
    var submitPrice = root.querySelector('[data-ecm-submit-price]');
    var variantInput = root.querySelector('[data-ecm-variant-id]');
    var setName = root.querySelector('[data-ecm-set-name]');
    var setPricePill = root.querySelector('[data-ecm-set-pricepill]');
    var comparePriceEl = root.querySelector('[data-ecm-compare-price]');
    var discountBadgeEl = root.querySelector('[data-ecm-discount-badge]');
    var colorName = root.querySelector('[data-ecm-color-name]');

    // ---- colors ----
    var colors = [];
    try { colors = JSON.parse(root.querySelector('[data-ecm-colors-json]').textContent); } catch (e) {}
    colors.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ecm-color' + (i === 0 ? ' is-active' : '');
      b.innerHTML = '<img src="' + c.swatch + '" alt="' + c.label + '">';
      b.addEventListener('click', function () {
        colorWrap.querySelectorAll('.ecm-color').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        previews.forEach(function (preview) { preview.src = c.preview; });
        var captionText = c.caption || c.label;
        var badgeText = c.badge || c.label;
        captions.forEach(function (caption) { caption.textContent = captionText; });
        if (colorName) colorName.textContent = badgeText;
        if (colorProp) colorProp.value = c.label;
      });
      colorWrap.appendChild(b);
    });

    // preload all colour previews so switching a colour is instant (no network delay on tap)
    (function () {
      var pre = function () { colors.forEach(function (c) { if (c.preview) { var im = new Image(); im.src = c.preview; } }); };
      if ('requestIdleCallback' in window) requestIdleCallback(pre); else setTimeout(pre, 500);
    })();

    // ---- sets (filtered by seat-count of the chosen body) ----
    var SET_5OS = ['front', 'front_rear', 'front_rear_boot', 'rear', 'boot'];
    var SET_2OS = ['front', 'front_rear_boot', 'boot'];
    var SET_7OS = ['front', 'front_rear', 'front_rear_boot', 'front_rear_third', 'front_rear_third_small_boot', 'front_rear_third_large_boot', 'three_rows_two_boots', 'front_rear_large_boot', 'rear', 'boot'];
    var currentSeat = '5os';
    function selectSet(btn) {
      root.querySelectorAll('[data-ecm-set]').forEach(function (x) { x.classList.remove('is-active'); });
      btn.classList.add('is-active');
      if (variantInput) variantInput.value = btn.getAttribute('data-variant-id');
      var sale = parseFloat(btn.getAttribute('data-price')) || 0;
      var comp = parseFloat(btn.getAttribute('data-compare')) || 0;
      var hasDisc = comp > sale + 1;
      var pct = hasDisc ? Math.max(1, Math.round((1 - sale / comp) * 100)) : 0;
      var saleTxt = money(sale);
      if (priceEl) priceEl.textContent = saleTxt;
      if (submitPrice) submitPrice.textContent = saleTxt;
      var displayName = currentSeat === '2os' ? btn.getAttribute('data-name-2os') : btn.getAttribute('data-name');
      if (setName) setName.textContent = displayName || btn.getAttribute('data-name');
      if (comparePriceEl) { comparePriceEl.textContent = money(comp); comparePriceEl.hidden = !hasDisc; }
      if (discountBadgeEl) { discountBadgeEl.textContent = '-' + pct + '%'; discountBadgeEl.hidden = !hasDisc; }
      if (setPricePill) {
        setPricePill.innerHTML = hasDisc
          ? '<s class="ecm-pill-compare">' + money(comp) + '</s><span class="ecm-pill-current">' + saleTxt + '</span><span class="ecm-pill-sale">-' + pct + '%</span>'
          : saleTxt;
      }
    }
    function filterSetsBySeat(seat) {
      currentSeat = seat === '7os' || seat === '2os' ? seat : '5os';
      var allow = seat === '7os' ? SET_7OS : (seat === '2os' ? SET_2OS : SET_5OS);
      var firstVisible = null;
      root.querySelectorAll('[data-ecm-set]').forEach(function (b) {
        var code = b.getAttribute('data-set-code');
        var image = b.getAttribute('data-image-' + currentSeat);
        var ok = allow.indexOf(code) >= 0 && !!image;
        b.style.display = ok ? '' : 'none';
        var img = b.querySelector('img');
        if (img && image) img.src = image;
        var title = currentSeat === '2os' ? b.getAttribute('data-name-2os') : b.getAttribute('data-name');
        if (title) {
          b.title = title;
          if (img) img.alt = title;
        }
        if (ok && !firstVisible) firstVisible = b;
      });
      if (firstVisible) selectSet(firstVisible);
    }
    root.querySelectorAll('[data-ecm-set]').forEach(function (btn) { btn.addEventListener('click', function () { selectSet(btn); }); });
    filterSetsBySeat('5os');

    // ---- vehicle cascade (data: {brand:{model:[{generation,bodies}]}}) ----
    var DATA = {};
    var brandInput = root.querySelector('[data-ecm-brand]');
    var modelInput = root.querySelector('[data-ecm-model]');
    var vehicleProp = root.querySelector('[data-ecm-vehicle-prop]');
    var st = { brand: '', model: '', gen: '', body: '' };

    var stepValue = root.querySelector('[data-ecm-step-value]');
    var stepError = root.querySelector('[data-ecm-step-error]');
    function vehicleComplete() { return !!(st.brand && st.model && st.gen && st.body); }
    function syncProp() {
      var v = [st.brand, st.model, st.gen, st.body].filter(Boolean).join(' · ');
      if (vehicleProp) vehicleProp.value = v;
      if (stepValue) stepValue.textContent = v;
      if (stepError && vehicleComplete()) stepError.hidden = true;
    }
    function cleanVehicleText(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }
    function splitVehicleModel(model, generation) {
      var modelText = cleanVehicleText(model);
      var genText = cleanVehicleText(generation);
      var match = modelText.match(/^(.+?)\s+((?:[IVXLCDM]+|\d+)\s+gen)$/i);
      if (!match) return { model: modelText, generation: genText };
      return {
        model: cleanVehicleText(match[1]),
        generation: cleanVehicleText(match[2] + (genText ? ' ' + genText : ''))
      };
    }
    function bodySeatMarker(body) {
      var value = cleanVehicleText(body).toLowerCase();
      if (/\b2\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat)/i.test(value)) return '2os';
      if (/\b7\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat)/i.test(value)) return '7os';
      return '5os';
    }
    function seatLabel(seat) {
      var count = seat === '2os' ? '2' : (seat === '7os' ? '7' : '5');
      if (String(locale).toLowerCase().indexOf('cs') === 0) return count + ' míst';
      if (String(locale).toLowerCase().indexOf('de') === 0) return count + ' Sitze';
      return count + ' seats';
    }
    function normalizeBodyLabel(body) {
      var text = cleanVehicleText(body);
      var seat = bodySeatMarker(text);
      var hasSeatMarker = /\b(?:2|5|7)\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat)/i.test(text);
      var base = text
        .replace(/\b(?:2|5|7)\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz(?:e)?|seat(?:s)?)\b/ig, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (/^suv$/i.test(base)) base = 'SUV';
      if (!base) base = text;
      return hasSeatMarker ? base + ' · ' + seatLabel(seat) : base;
    }
    function uniqueList(items) {
      var seen = {};
      return items.filter(function (item) {
        if (seen[item]) return false;
        seen[item] = true;
        return true;
      });
    }
    function normalizeVehicleData(data) {
      var normalized = {};
      Object.keys(data || {}).forEach(function (brand) {
        normalized[brand] = {};
        Object.keys(data[brand] || {}).forEach(function (modelKey) {
          (data[brand][modelKey] || []).forEach(function (entry) {
            var split = splitVehicleModel(modelKey, entry.generation);
            var model = split.model;
            var generation = split.generation || cleanVehicleText(entry.generation);
            var bodies = [];
            var seatByBody = {};
            (entry.bodies || []).forEach(function (rawBody) {
              var normalizedBody = normalizeBodyLabel(rawBody);
              if (bodies.indexOf(normalizedBody) < 0) bodies.push(normalizedBody);
              seatByBody[normalizedBody] = (entry.seatByBody && entry.seatByBody[rawBody]) || bodySeatMarker(rawBody);
            });
            if (!normalized[brand][model]) normalized[brand][model] = [];
            var existing = normalized[brand][model].filter(function (item) { return item.generation === generation; })[0];
            if (existing) {
              existing.bodies = uniqueList(existing.bodies.concat(bodies));
              existing.seatByBody = Object.assign(existing.seatByBody || {}, seatByBody);
            } else {
              normalized[brand][model].push({ generation: generation, bodies: bodies, seatByBody: seatByBody });
            }
          });
        });
      });
      return normalized;
    }
    function combo(comboEl, onPick) {
      var input = comboEl.querySelector('.ecm-combo-input');
      var list = comboEl.querySelector('.ecm-combo-list');
      var items = [];
      var selected = '';
      function render(showAll) {
        var f = showAll ? '' : input.value.toLowerCase();
        list.innerHTML = '';
        var matched = items.filter(function (t) { return t.toLowerCase().indexOf(f) >= 0; });
        if (!matched.length) { list.innerHTML = '<li class="ecm-combo-empty"></li>'; list.firstChild.textContent = text.noResults; list.hidden = false; return; }
        matched.slice(0, 200).forEach(function (t) {
          var li = document.createElement('li');
          li.className = 'ecm-combo-opt' + (t === selected ? ' is-selected' : '');
          var text = document.createElement('span');
          text.textContent = t;
          li.appendChild(text);
          if (t === selected) {
            var check = document.createElement('span');
            check.className = 'ecm-combo-check';
            check.textContent = '✓';
            li.appendChild(check);
          }
          li.addEventListener('mousedown', function (e) { e.preventDefault(); selected = t; input.value = t; list.hidden = true; onPick(t); });
          list.appendChild(li);
        });
        list.hidden = false;
      }
      input.addEventListener('focus', function () { render(true); });
      input.addEventListener('click', function () { render(true); });
      input.addEventListener('input', function () { selected = ''; render(false); });
      input.addEventListener('blur', function () { setTimeout(function () { list.hidden = true; }, 150); });
      return {
        setItems: function (arr) { items = arr; },
        reset: function (ph, enabled) { selected = ''; input.value = ''; input.placeholder = ph; input.disabled = !enabled; list.hidden = true; }
      };
    }

    // gen + body are now custom combos (controlled dropdown position; no native-select jump on mobile)
    var bodySeat = {}; // body label -> seat ('5os'/'7os') so the set filter still works
    var bodyCombo = combo(root.querySelector('[data-ecm-combo="body"]'), function (body) {
      st.body = body;
      syncProp();
      filterSetsBySeat(bodySeat[body] || '5os');
    });
    var genCombo = combo(root.querySelector('[data-ecm-combo="gen"]'), function (gen) {
      st.gen = gen; st.body = '';
      var entry = (DATA[st.brand] && DATA[st.brand][st.model] || []).filter(function (g) { return g.generation === gen; })[0];
      var bodies = entry && entry.bodies ? entry.bodies : [];
      var single = bodies.length === 1;
      bodySeat = {};
      var labels = bodies.map(function (b) {
        // prefer the seat marker stored in the dataset; the label text is a fallback
        var seat = (entry.seatByBody && entry.seatByBody[b]) || bodySeatMarker(b);
        var label = single ? b.replace(/\s*·\s*(?:2|5|7)\s*(?:míst|Sitze|seats)/i, '').replace(/\s+/g, ' ').trim() : b;
        if (!label) label = b;
        bodySeat[label] = seat;
        return label;
      });
      bodyCombo.setItems(labels);
      bodyCombo.reset(labels.length ? text.chooseBody : text.noData, labels.length > 0);
      syncProp();
    });
    var modelCombo = combo(root.querySelector('[data-ecm-combo="model"]'), function (model) {
      st.model = model; st.gen = ''; st.body = '';
      var gens = (DATA[st.brand] && DATA[st.brand][model] ? DATA[st.brand][model] : []).map(function (g) { return g.generation; });
      genCombo.setItems(gens);
      genCombo.reset(gens.length ? text.chooseGeneration : text.noData, gens.length > 0);
      bodyCombo.setItems([]); bodyCombo.reset(text.bodyFirst, false);
      syncProp();
    });
    var brandCombo = combo(root.querySelector('[data-ecm-combo="brand"]'), function (brand) {
      st.brand = brand; st.model = ''; st.gen = ''; st.body = '';
      var models = DATA[brand] ? Object.keys(DATA[brand]).sort() : [];
      modelCombo.setItems(models);
      modelCombo.reset(models.length ? text.chooseModel : text.noData, models.length > 0);
      genCombo.setItems([]); genCombo.reset(text.generationFirst, false);
      bodyCombo.setItems([]); bodyCombo.reset(text.bodyFirst, false);
      syncProp();
    });

    fetch(root.getAttribute('data-vehicles')).then(function (r) { return r.json(); }).then(function (data) {
      DATA = normalizeVehicleData(data);
      brandCombo.setItems(Object.keys(DATA).sort());
    }).catch(function () {});

    // ---- accordion steps (config-style) ----
    var steps = [].slice.call(root.querySelectorAll('.ecm-step'));
    function openStep(step) {
      steps.forEach(function (s) { if (s !== step) s.classList.remove('is-open'); });
      step.classList.remove('is-disabled');
      step.classList.add('is-open');
    }
    steps.forEach(function (step) {
      var head = step.querySelector('.ecm-step-head');
      if (head) head.addEventListener('click', function () {
        if (step.classList.contains('is-disabled')) return;
        if (step.classList.contains('is-open')) step.classList.remove('is-open');
        else openStep(step);
      });
      var next = step.querySelector('.ecm-step-next');
      if (next) next.addEventListener('click', function () {
        if (step === steps[0] && !vehicleComplete()) { if (stepError) stepError.hidden = false; return; }
        if (stepError) stepError.hidden = true;
        step.classList.remove('is-open');
        step.classList.add('is-done');
        var idx = steps.indexOf(step);
        if (idx > -1 && steps[idx + 1]) openStep(steps[idx + 1]);
      });
    });
    var ecmForm = root.querySelector('[data-ecm-form]');
    if (ecmForm) ecmForm.addEventListener('submit', function (e) {
      if (!vehicleComplete()) {
        e.preventDefault();
        if (stepError) stepError.hidden = false;
        if (steps[0]) openStep(steps[0]);
      }
    });

    // ---- description tabs ----
    var dtabs = [].slice.call(root.querySelectorAll('[data-ecm-desc-tab]'));
    var dpanels = [].slice.call(root.querySelectorAll('[data-ecm-desc-panel]'));
    dtabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var k = t.getAttribute('data-ecm-desc-tab');
        dtabs.forEach(function (x) { x.classList.toggle('is-active', x === t); });
        dpanels.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-ecm-desc-panel') === k); });
      });
    });

    // ---- gallery (fast arrow strip, like organizer) ----
    var mainImg = root.querySelector('[data-ecm-main-img]');
    var box = root.querySelector('[data-ecm-lightbox]');
    var boxImg = root.querySelector('[data-ecm-lightbox-img]');
    function openBox(src) { if (box && boxImg) { boxImg.src = src; box.hidden = false; } }
    function closeBox() { if (box) box.hidden = true; }
    var galleryJsonEl = root.querySelector('[data-ecm-gallery-json]');
    var gallery = root.querySelector('[data-ecm-gallery]');
    if (galleryJsonEl && gallery && mainImg) {
      var gitems = [];
      try { gitems = JSON.parse(galleryJsonEl.textContent); } catch (e) {}
      var thumbsWrap = gallery.querySelector('[data-ecm-thumbs]');
      var gprev = gallery.querySelector('[data-ecm-gallery-prev]');
      var gnext = gallery.querySelector('[data-ecm-gallery-next]');
      var gActive = 0;
      if (thumbsWrap) thumbsWrap.innerHTML = gitems.map(function (it, i) {
        return '<button type="button" class="ecm-thumb' + (i === 0 ? ' is-active' : '') + '" data-ecm-gindex="' + i + '"><img src="' + (it.thumb || it.src) + '" alt="" loading="lazy"></button>';
      }).join('');
      // preload full-size images so arrow paging is instant
      gitems.forEach(function (it) { var im = new Image(); im.src = it.src; });
      function gSet(i) {
        gActive = Math.max(0, Math.min(gitems.length - 1, i));
        var it = gitems[gActive]; if (!it) return;
        mainImg.src = it.src; mainImg.alt = it.alt || '';
        var btn = thumbsWrap && thumbsWrap.querySelector('[data-ecm-gindex="' + gActive + '"]');
        if (thumbsWrap) thumbsWrap.querySelectorAll('.ecm-thumb').forEach(function (x) { x.classList.toggle('is-active', x === btn); });
        if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        if (gprev) gprev.disabled = gActive === 0;
        if (gnext) gnext.disabled = gActive === gitems.length - 1;
      }
      if (thumbsWrap) thumbsWrap.querySelectorAll('[data-ecm-gindex]').forEach(function (b) {
        b.addEventListener('click', function () { gSet(Number(b.getAttribute('data-ecm-gindex'))); });
      });
      if (gprev) gprev.addEventListener('click', function () { gSet(gActive - 1); });
      if (gnext) gnext.addEventListener('click', function () { gSet(gActive + 1); });
      gSet(0);
    }
    var mainWrap = root.querySelector('[data-ecm-gallery-main]');
    if (mainWrap && mainImg) mainWrap.addEventListener('click', function () { openBox(mainImg.src); });
    if (box) {
      box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
      var cl = root.querySelector('[data-ecm-lightbox-close]'); if (cl) cl.addEventListener('click', closeBox);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });
    }
  });
})();
