(function () {
  document.querySelectorAll("[data-ecm]").forEach(function (root) {
    var locale =
        root.getAttribute("data-locale") ||
        document.documentElement.lang ||
        "en",
      currency = root.getAttribute("data-currency") || "EUR",
      text = {
        noResults: root.getAttribute("data-no-results") || "No results",
        noData: root.getAttribute("data-no-data") || "No data available",
        chooseModel:
          root.getAttribute("data-choose-model") || "Choose a model\u2026",
        chooseGeneration:
          root.getAttribute("data-choose-generation") ||
          "Choose a generation\u2026",
        chooseBody:
          root.getAttribute("data-choose-body") || "Choose a body style\u2026",
        modelFirst:
          root.getAttribute("data-model-first") || "Choose a make first",
        generationFirst:
          root.getAttribute("data-generation-first") || "Choose a model first",
        bodyFirst:
          root.getAttribute("data-body-first") || "Choose a generation first",
      };
    function money(cents) {
      var amount = (Number(cents) || 0) / 100;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency,
          minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (e) {
        return amount.toFixed(2) + " " + currency;
      }
    }
    var previews = [].slice.call(root.querySelectorAll("[data-ecm-preview]")),
      captions = [].slice.call(
        root.querySelectorAll("[data-ecm-preview-caption]"),
      ),
      colorWrap = root.querySelector("[data-ecm-colors]"),
      colorProp = root.querySelector("[data-ecm-color-prop]"),
      priceEls = [].slice.call(root.querySelectorAll("[data-ecm-price]")),
      variantInput = root.querySelector("[data-ecm-variant-id]"),
      setName = root.querySelector("[data-ecm-set-name]"),
      setPricePill = root.querySelector("[data-ecm-set-pricepill]"),
      comparePriceEls = [].slice.call(
        root.querySelectorAll("[data-ecm-compare-price]"),
      ),
      discountBadgeEls = [].slice.call(
        root.querySelectorAll("[data-ecm-discount-badge]"),
      ),
      colorName = root.querySelector("[data-ecm-color-name]"),
      colorButtons = [].slice.call(root.querySelectorAll("[data-ecm-color]")),
      colors = colorButtons.map(function (b) {
        return {
          label: b.getAttribute("data-label") || "",
          badge: b.getAttribute("data-badge") || "",
          caption: b.getAttribute("data-caption") || "",
          preview: b.getAttribute("data-preview") || "",
        };
      });
    (colorButtons.forEach(function (b, i) {
      var c = colors[i];
      b.addEventListener("click", function () {
        (colorWrap.querySelectorAll(".ecm-color").forEach(function (x) {
          x.classList.remove("is-active");
        }),
          b.classList.add("is-active"),
          previews.forEach(function (preview) {
            preview.src = c.preview;
          }));
        var captionText = c.caption || c.label,
          badgeText = c.badge || c.label;
        (captions.forEach(function (caption) {
          caption.textContent = captionText;
        }),
          colorName && (colorName.textContent = badgeText),
          colorProp && (colorProp.value = c.label));
      });
    }),
      (function () {
        var pre = function () {
          colors.forEach(function (c) {
            if (c.preview) {
              var im = new Image();
              im.src = c.preview;
            }
          });
        };
        "requestIdleCallback" in window
          ? requestIdleCallback(pre)
          : setTimeout(pre, 500);
      })());
    var SET_5OS = ["front", "front_rear", "front_rear_boot", "rear", "boot"],
      SET_2OS = ["front", "front_rear_boot", "boot"],
      SET_7OS = [
        "front",
        "front_rear",
        "front_rear_boot",
        "front_rear_third",
        "front_rear_third_small_boot",
        "front_rear_third_large_boot",
        "three_rows_two_boots",
        "front_rear_large_boot",
        "rear",
        "boot",
      ],
      currentSeat = "5os";
    function selectSet(btn) {
      (root.querySelectorAll("[data-ecm-set]").forEach(function (x) {
        x.classList.remove("is-active");
      }),
        btn.classList.add("is-active"),
        variantInput &&
          (variantInput.value = btn.getAttribute("data-variant-id")));
      var sale = parseFloat(btn.getAttribute("data-price")) || 0,
        comp = parseFloat(btn.getAttribute("data-compare")) || 0,
        hasDisc = comp > sale + 1,
        pct = hasDisc ? Math.max(1, Math.round((1 - sale / comp) * 100)) : 0,
        saleTxt = money(sale);
      priceEls.forEach(function (el) {
        el.textContent = saleTxt;
      });
      var displayName =
        currentSeat === "2os"
          ? btn.getAttribute("data-name-2os")
          : btn.getAttribute("data-name");
      (setName &&
        (setName.textContent = displayName || btn.getAttribute("data-name")),
        comparePriceEls.forEach(function (el) {
          ((el.textContent = money(comp)), (el.hidden = !hasDisc));
        }),
        discountBadgeEls.forEach(function (el) {
          ((el.textContent = "-" + pct + "%"), (el.hidden = !hasDisc));
        }),
        setPricePill &&
          (setPricePill.innerHTML = hasDisc
            ? '<s class="ecm-pill-compare">' +
              money(comp) +
              '</s><span class="ecm-pill-current">' +
              saleTxt +
              '</span><span class="ecm-pill-sale">-' +
              pct +
              "%</span>"
            : saleTxt));
    }
    function filterSetsBySeat(seat) {
      currentSeat = seat === "7os" || seat === "2os" ? seat : "5os";
      var allow = seat === "7os" ? SET_7OS : seat === "2os" ? SET_2OS : SET_5OS,
        firstVisible = null;
      (root.querySelectorAll("[data-ecm-set]").forEach(function (b) {
        var code = b.getAttribute("data-set-code"),
          image = b.getAttribute("data-image-" + currentSeat),
          ok = allow.indexOf(code) >= 0 && !!image;
        b.style.display = ok ? "" : "none";
        var img = b.querySelector("img");
        img && image && (img.src = image);
        var title =
          currentSeat === "2os"
            ? b.getAttribute("data-name-2os")
            : b.getAttribute("data-name");
        (title && ((b.title = title), img && (img.alt = title)),
          ok && !firstVisible && (firstVisible = b));
      }),
        firstVisible && selectSet(firstVisible));
    }
    (root.querySelectorAll("[data-ecm-set]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectSet(btn);
      });
    }),
      filterSetsBySeat("5os"));
    var DATA = {},
      brandInput = root.querySelector("[data-ecm-brand]"),
      modelInput = root.querySelector("[data-ecm-model]"),
      vehicleProp = root.querySelector("[data-ecm-vehicle-prop]"),
      st = { brand: "", model: "", gen: "", body: "" },
      stepValue = root.querySelector("[data-ecm-step-value]"),
      stepError = root.querySelector("[data-ecm-step-error]");
    function vehicleComplete() {
      return !!(st.brand && st.model && st.gen && st.body);
    }
    function syncProp() {
      var v = [st.brand, st.model, st.gen, st.body]
        .filter(Boolean)
        .join(" \xB7 ");
      (vehicleProp && (vehicleProp.value = v),
        stepValue && (stepValue.textContent = v),
        stepError && vehicleComplete() && (stepError.hidden = !0));
    }
    function cleanVehicleText(value) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    }
    function splitVehicleModel(model, generation) {
      var modelText = cleanVehicleText(model),
        genText = cleanVehicleText(generation),
        match = modelText.match(/^(.+?)\s+((?:[IVXLCDM]+|\d+)\s+gen)$/i);
      return match
        ? {
            model: cleanVehicleText(match[1]),
            generation: cleanVehicleText(
              match[2] + (genText ? " " + genText : ""),
            ),
          }
        : { model: modelText, generation: genText };
    }
    function bodySeatMarker(body) {
      var value = cleanVehicleText(body).toLowerCase();
      return /\b2\s*[-–—]?\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat|viet(?:a|as|īgs|īga))/i.test(
        value,
      )
        ? "2os"
        : /\b7\s*[-–—]?\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat|viet(?:a|as|īgs|īga))/i.test(
              value,
            )
          ? "7os"
          : "5os";
    }
    function seatLabel(seat) {
      var count = seat === "2os" ? "2" : seat === "7os" ? "7" : "5";
      return String(locale).toLowerCase().indexOf("lv") === 0
        ? count + " vietas"
        : String(locale).toLowerCase().indexOf("cs") === 0
        ? count + " m\xEDst"
        : String(locale).toLowerCase().indexOf("de") === 0
          ? count + " Sitze"
          : count + " seats";
    }
    function normalizeBodyLabel(body) {
      var text2 = cleanVehicleText(body),
        seat = bodySeatMarker(text2),
        doorMatch = text2.match(
          /\b(\d+)\s*(?:drzwi|dve(?:ř|r)e|t(?:ü|u)ren?|doors?|durvis)\b/i,
        ),
        doorCount = doorMatch ? doorMatch[1] : "",
        hasSeatMarker =
          /\b(?:2|5|7)\s*[-–—]?\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz|seat|viet(?:a|as|īgs|īga))/i.test(
            text2,
          ),
        base = text2
          .replace(
            /\b(?:2|5|7)\s*[-–—]?\s*(?:os|os\.|osobowy|osobowa|miejscowy|miejscowa|míst|sitz(?:e)?|seat(?:s)?|viet(?:a|as|īgs|īga))\b/gi,
            "",
          )
          .replace(/\b\d+\s*(?:drzwi|dve(?:ř|r)e|t(?:ü|u)ren?|doors?|durvis)\b/gi, "")
          .replace(/\s*[·,]\s*$/, "")
          .replace(/\s+/g, " ")
          .trim();
      var isLatvian = String(locale).toLowerCase().indexOf("lv") === 0;
      if (isLatvian) {
        var lvBodies = {
          hatchback: "Hečbeks",
          estate: "Universālis",
          "station wagon": "Universālis",
          kombi: "Universālis",
          convertible: "Kabriolets",
          cabriolet: "Kabriolets",
          van: "Furgons",
          minivan: "Minivens",
          liftback: "Liftbeks",
          roadster: "Rodsters",
          pickup: "Pikaps",
          crossover: "Krosovers",
          bus: "Autobuss",
          truck: "Kravas auto",
          tir: "Kravas auto",
          coupe: "Kupeja",
          sedan: "Sedans",
        };
        var translatedBody = lvBodies[base.toLowerCase()];
        if (translatedBody) base = translatedBody;
      }
      return (
        /^suv$/i.test(base) && (base = "SUV"),
        !isLatvian && /^hatchback$/i.test(base) &&
          (String(locale).toLowerCase().indexOf("cs") === 0
            ? (base = "Hatchback")
            : String(locale).toLowerCase().indexOf("de") === 0
              ? (base = "Schr\xE4gheck")
              : (base = "Hatchback")),
        doorCount &&
          (isLatvian
            ? (base += ", " + doorCount + " durvis")
            : String(locale).toLowerCase().indexOf("cs") === 0
            ? (base += ", " + doorCount + " dve\u0159e")
            : String(locale).toLowerCase().indexOf("de") === 0
              ? (base += ", " + doorCount + " T\xFCren")
              : (base = doorCount + "-door " + base.toLowerCase())),
        base || (base = text2),
        hasSeatMarker ? base + " \xB7 " + seatLabel(seat) : base
      );
    }
    function removeGenericBodyDuplicates(bodies) {
      return bodies.filter(function (body) {
        var plain = cleanVehicleText(body).toLowerCase(),
          isGenericHatch =
            plain === "hatchback" ||
            plain === "schr\xE4gheck" ||
            plain === "hečbeks";
        return isGenericHatch
          ? !bodies.some(function (candidate) {
              var value = cleanVehicleText(candidate).toLowerCase();
              return (
                candidate !== body &&
                /hatchback|schrägheck|hečbeks/.test(value) &&
                /\b\d+[- ]?(?:door|dveře|türen|durvis)/.test(value)
              );
            })
          : !0;
      });
    }
    function uniqueList(items) {
      var seen = {};
      return items.filter(function (item) {
        return seen[item] ? !1 : ((seen[item] = !0), !0);
      });
    }
    function normalizeVehicleData(data) {
      var normalized = {};
      return (
        Object.keys(data || {}).forEach(function (brand) {
          ((normalized[brand] = {}),
            Object.keys(data[brand] || {}).forEach(function (modelKey) {
              (data[brand][modelKey] || []).forEach(function (entry) {
                var split = splitVehicleModel(modelKey, entry.generation),
                  model = split.model,
                  generation =
                    split.generation || cleanVehicleText(entry.generation),
                  bodies = [],
                  seatByBody = {};
                ((entry.bodies || []).forEach(function (rawBody) {
                  var normalizedBody = normalizeBodyLabel(rawBody);
                  (bodies.indexOf(normalizedBody) < 0 &&
                    bodies.push(normalizedBody),
                    (seatByBody[normalizedBody] =
                      (entry.seatByBody && entry.seatByBody[rawBody]) ||
                      bodySeatMarker(rawBody)));
                }),
                  (bodies = removeGenericBodyDuplicates(bodies)),
                  normalized[brand][model] || (normalized[brand][model] = []));
                var existing = normalized[brand][model].filter(function (item) {
                  return item.generation === generation;
                })[0];
                existing
                  ? ((existing.bodies = removeGenericBodyDuplicates(
                      uniqueList(existing.bodies.concat(bodies)),
                    )),
                    (existing.seatByBody = Object.assign(
                      existing.seatByBody || {},
                      seatByBody,
                    )))
                  : normalized[brand][model].push({
                      generation: generation,
                      bodies: bodies,
                      seatByBody: seatByBody,
                    });
              });
            }));
        }),
        normalized
      );
    }
    function combo(comboEl, onPick) {
      var input = comboEl.querySelector(".ecm-combo-input"),
        list = comboEl.querySelector(".ecm-combo-list"),
        items = [],
        selected = "";
      function render(showAll) {
        var f = showAll ? "" : input.value.toLowerCase();
        list.innerHTML = "";
        var matched = items.filter(function (t) {
          return t.toLowerCase().indexOf(f) >= 0;
        });
        if (!matched.length) {
          ((list.innerHTML = '<li class="ecm-combo-empty"></li>'),
            (list.firstChild.textContent = text.noResults),
            (list.hidden = !1));
          return;
        }
        (matched.slice(0, 200).forEach(function (t) {
          var li = document.createElement("li");
          li.className =
            "ecm-combo-opt" + (t === selected ? " is-selected" : "");
          var text2 = document.createElement("span");
          if (
            ((text2.textContent = t), li.appendChild(text2), t === selected)
          ) {
            var check = document.createElement("span");
            ((check.className = "ecm-combo-check"),
              (check.textContent = "\u2713"),
              li.appendChild(check));
          }
          (li.addEventListener("mousedown", function (e) {
            (e.preventDefault(),
              (selected = t),
              (input.value = t),
              (list.hidden = !0),
              onPick(t));
          }),
            list.appendChild(li));
        }),
          (list.hidden = !1));
      }
      return (
        input.addEventListener("focus", function () {
          render(!0);
        }),
        input.addEventListener("click", function () {
          render(!0);
        }),
        input.addEventListener("input", function () {
          ((selected = ""), render(!1));
        }),
        input.addEventListener("blur", function () {
          setTimeout(function () {
            list.hidden = !0;
          }, 150);
        }),
        {
          setItems: function (arr) {
            items = arr;
          },
          reset: function (ph, enabled) {
            ((selected = ""),
              (input.value = ""),
              (input.placeholder = ph),
              (input.disabled = !enabled),
              (list.hidden = !0));
          },
        }
      );
    }
    var bodySeat = {},
      bodyCombo = combo(
        root.querySelector('[data-ecm-combo="body"]'),
        function (body) {
          ((st.body = body),
            syncProp(),
            filterSetsBySeat(bodySeat[body] || "5os"));
        },
      ),
      genCombo = combo(
        root.querySelector('[data-ecm-combo="gen"]'),
        function (gen) {
          ((st.gen = gen), (st.body = ""));
          var entry = (
              (DATA[st.brand] && DATA[st.brand][st.model]) ||
              []
            ).filter(function (g) {
              return g.generation === gen;
            })[0],
            bodies = entry && entry.bodies ? entry.bodies : [],
            single = bodies.length === 1;
          bodySeat = {};
          var labels = bodies.map(function (b) {
            var seat =
                (entry.seatByBody && entry.seatByBody[b]) || bodySeatMarker(b),
              label = single
                ? b
                    .replace(
                      /\s*·\s*(?:2|5|7)\s*(?:míst|Sitze|seats|vietas)/i,
                      "",
                    )
                    .replace(/\s+/g, " ")
                    .trim()
                : b;
            return (label || (label = b), (bodySeat[label] = seat), label);
          });
          (bodyCombo.setItems(labels),
            bodyCombo.reset(
              labels.length ? text.chooseBody : text.noData,
              labels.length > 0,
            ),
            syncProp());
        },
      ),
      modelCombo = combo(
        root.querySelector('[data-ecm-combo="model"]'),
        function (model) {
          ((st.model = model), (st.gen = ""), (st.body = ""));
          var gens = (
            DATA[st.brand] && DATA[st.brand][model] ? DATA[st.brand][model] : []
          ).map(function (g) {
            return g.generation;
          });
          (genCombo.setItems(gens),
            genCombo.reset(
              gens.length ? text.chooseGeneration : text.noData,
              gens.length > 0,
            ),
            bodyCombo.setItems([]),
            bodyCombo.reset(text.bodyFirst, !1),
            syncProp());
        },
      ),
      brandCombo = combo(
        root.querySelector('[data-ecm-combo="brand"]'),
        function (brand) {
          ((st.brand = brand), (st.model = ""), (st.gen = ""), (st.body = ""));
          var models = DATA[brand] ? Object.keys(DATA[brand]).sort() : [];
          (modelCombo.setItems(models),
            modelCombo.reset(
              models.length ? text.chooseModel : text.noData,
              models.length > 0,
            ),
            genCombo.setItems([]),
            genCombo.reset(text.generationFirst, !1),
            bodyCombo.setItems([]),
            bodyCombo.reset(text.bodyFirst, !1),
            syncProp());
        },
      );
    fetch(root.getAttribute("data-vehicles"))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        ((DATA = normalizeVehicleData(data)),
          brandCombo.setItems(Object.keys(DATA).sort()));
      })
      .catch(function () {});
    var steps = [].slice.call(root.querySelectorAll(".ecm-step"));
    function openStep(step) {
      (steps.forEach(function (s) {
        s !== step && s.classList.remove("is-open");
      }),
        step.classList.remove("is-disabled"),
        step.classList.add("is-open"));
    }
    steps.forEach(function (step) {
      var head = step.querySelector(".ecm-step-head");
      head &&
        head.addEventListener("click", function () {
          step.classList.contains("is-disabled") ||
            (step.classList.contains("is-open")
              ? step.classList.remove("is-open")
              : openStep(step));
        });
      var next = step.querySelector(".ecm-step-next");
      next &&
        next.addEventListener("click", function () {
          if (step === steps[0] && !vehicleComplete()) {
            stepError && (stepError.hidden = !1);
            return;
          }
          (stepError && (stepError.hidden = !0),
            step.classList.remove("is-open"),
            step.classList.add("is-done"));
          var idx = steps.indexOf(step);
          idx > -1 && steps[idx + 1] && openStep(steps[idx + 1]);
        });
    });
    var ecmForm = root.querySelector("[data-ecm-form]");
    ecmForm &&
      ecmForm.addEventListener("submit", function (e) {
        vehicleComplete() ||
          (e.preventDefault(),
          stepError && (stepError.hidden = !1),
          steps[0] && openStep(steps[0]));
      });
    var dtabs = [].slice.call(root.querySelectorAll("[data-ecm-desc-tab]")),
      dpanels = [].slice.call(root.querySelectorAll("[data-ecm-desc-panel]"));
    dtabs.forEach(function (t) {
      t.addEventListener("click", function () {
        var k = t.getAttribute("data-ecm-desc-tab");
        (dtabs.forEach(function (x) {
          x.classList.toggle("is-active", x === t);
        }),
          dpanels.forEach(function (p) {
            p.classList.toggle(
              "is-active",
              p.getAttribute("data-ecm-desc-panel") === k,
            );
          }));
      });
    });
    var mainImg = root.querySelector("[data-ecm-main-img]"),
      box = root.querySelector("[data-ecm-lightbox]"),
      boxImg = root.querySelector("[data-ecm-lightbox-img]");
    function openBox(src) {
      box && boxImg && ((boxImg.src = src), (box.hidden = !1));
    }
    function closeBox() {
      box && (box.hidden = !0);
    }
    var galleryJsonEl = root.querySelector("[data-ecm-gallery-json]"),
      gallery = root.querySelector("[data-ecm-gallery]");
    if (galleryJsonEl && gallery && mainImg) {
      var gSet2 = function (i) {
          gActive = Math.max(0, Math.min(gitems.length - 1, i));
          var it = gitems[gActive];
          if (it) {
            ((mainImg.src = it.src), (mainImg.alt = it.alt || ""));
            var btn =
              thumbsWrap &&
              thumbsWrap.querySelector('[data-ecm-gindex="' + gActive + '"]');
            (thumbsWrap &&
              thumbsWrap.querySelectorAll(".ecm-thumb").forEach(function (x) {
                x.classList.toggle("is-active", x === btn);
              }),
              btn &&
                btn.scrollIntoView &&
                btn.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                  behavior: "smooth",
                }),
              gprev && (gprev.disabled = gActive === 0),
              gnext && (gnext.disabled = gActive === gitems.length - 1));
          }
        },
        gSet = gSet2,
        gitems = [];
      try {
        gitems = JSON.parse(galleryJsonEl.textContent);
      } catch (e) {}
      var thumbsWrap = gallery.querySelector("[data-ecm-thumbs]"),
        gprev = gallery.querySelector("[data-ecm-gallery-prev]"),
        gnext = gallery.querySelector("[data-ecm-gallery-next]"),
        gActive = 0;
      (thumbsWrap &&
        (thumbsWrap.innerHTML = gitems
          .map(function (it, i) {
            return (
              '<button type="button" class="ecm-thumb' +
              (i === 0 ? " is-active" : "") +
              '" data-ecm-gindex="' +
              i +
              '"><img src="' +
              (it.thumb || it.src) +
              '" alt="" loading="lazy"></button>'
            );
          })
          .join("")),
        gitems.forEach(function (it) {
          var im = new Image();
          im.src = it.src;
        }),
        thumbsWrap &&
          thumbsWrap
            .querySelectorAll("[data-ecm-gindex]")
            .forEach(function (b) {
              b.addEventListener("click", function () {
                gSet2(Number(b.getAttribute("data-ecm-gindex")));
              });
            }),
        gprev &&
          gprev.addEventListener("click", function () {
            gSet2(gActive - 1);
          }),
        gnext &&
          gnext.addEventListener("click", function () {
            gSet2(gActive + 1);
          }),
        gSet2(0));
    }
    var mainWrap = root.querySelector("[data-ecm-gallery-main]");
    if (
      (mainWrap &&
        mainImg &&
        mainWrap.addEventListener("click", function () {
          openBox(mainImg.src);
        }),
      box)
    ) {
      box.addEventListener("click", function (e) {
        e.target === box && closeBox();
      });
      var cl = root.querySelector("[data-ecm-lightbox-close]");
      (cl && cl.addEventListener("click", closeBox),
        document.addEventListener("keydown", function (e) {
          e.key === "Escape" && closeBox();
        }));
    }
  });
})();
//# sourceMappingURL=/s/files/1/0790/9218/7414/t/28/assets/velour-mats-configurator.js.map?v=1786012798
