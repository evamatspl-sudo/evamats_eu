(function () {
  "use strict";
  var previewCache = new Map();

  function formatMoney(amount, currency, locale) {
    if (typeof amount !== "number" || Number.isNaN(amount)) return "";
    var fixedSymbols = {
      UAH: "₴",
      EUR: "€",
      PLN: "zł",
      USD: "$",
      GBP: "£",
    };
    try {
      var formatted = new Intl.NumberFormat(locale || undefined, {
        style: "currency",
        currency: currency || "EUR",
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
      var code = (currency || "").toUpperCase();
      if (fixedSymbols[code]) {
        formatted = formatted.replace(new RegExp("\\b" + code + "\\b", "g"), fixedSymbols[code]);
      }
      // Remove trailing zero decimals like ".00" / ",00".
      formatted = formatted.replace(/([.,]00)(?!\d)/, "");
      return formatted;
    } catch (e) {
      return amount.toFixed(2);
    }
  }

  function buildPreviewUrl(root) {
    var base = root.dataset.proxyUrl || "/apps/evamats-discounts/preview";
    var url = new URL(base, window.location.origin);
    url.searchParams.set("productId", root.dataset.productId || "");
    url.searchParams.set("variantId", root.dataset.variantId || "");
    url.searchParams.set("variantTitle", root.dataset.variantTitle || "");
    if (root.dataset.basePriceCents) {
      var priceMajor = parseInt(root.dataset.basePriceCents, 10) / 100;
      url.searchParams.set("price", String(priceMajor));
    }
    if (root.dataset.bodyType) {
      url.searchParams.set("bodyType", root.dataset.bodyType);
    }
    return url.toString();
  }

  function renderSavings(template, best, basePrice, currency, locale) {
    if (!template || !best) return "";
    var percent =
      best.discountType === "percentage"
        ? String(best.value)
        : basePrice > 0 && best.amountOff
          ? ((best.amountOff / basePrice) * 100).toFixed(0)
          : "0";
    var amount =
      typeof best.amountOff === "number"
        ? formatMoney(best.amountOff, currency, locale)
        : "";
    return String(template)
      .replace(/\{percent\}/g, percent)
      .replace(/\{amount\}/g, amount);
  }

  function dispatchDiscountUpdated() {
    document.dispatchEvent(new CustomEvent("evamats:discount-updated"));
  }

  function syncOptionPrice(regularText, compareText) {
    var optionRegular = document.querySelectorAll(".option__price_regular");
    var optionCompare = document.querySelectorAll(".option__price_compare");
    optionRegular.forEach(function (el) {
      el.textContent = regularText || "";
    });
    optionCompare.forEach(function (el) {
      if (compareText) {
        el.textContent = compareText;
        el.classList.remove("hidden");
      } else {
        el.textContent = "";
        el.classList.add("hidden");
      }
    });
  }

  function applyNoDiscount(root) {
    var saleEl = root.querySelector("[data-evamats-sale]");
    var compareEl = root.querySelector("[data-evamats-compare]");
    var savingsEl = root.querySelector("[data-evamats-savings]");
    var basePrice = root.dataset.basePriceCents
      ? parseInt(root.dataset.basePriceCents, 10) / 100
      : 0;
    var currency = root.dataset.currency || "EUR";
    var locale = root.dataset.locale || undefined;
    var money = formatMoney(basePrice, currency, locale);
    if (compareEl) {
      compareEl.textContent = money;
      compareEl.style.visibility = "visible";
      compareEl.style.textDecoration = "none";
    }
    if (saleEl) {
      saleEl.textContent = money;
      saleEl.setAttribute("data-discounted-price", String(basePrice.toFixed(2)));
      saleEl.style.display = "none";
    }
    if (savingsEl) {
      savingsEl.textContent = "";
      savingsEl.style.display = "none";
    }
    syncOptionPrice(money, null);
    root.dataset.hasDiscount = "false";
    dispatchDiscountUpdated();
  }

  function applyDiscount(root, data) {
    var best = data && data.best ? data.best : null;
    if (!best) {
      applyNoDiscount(root);
      return;
    }
    var saleEl = root.querySelector("[data-evamats-sale]");
    var compareEl = root.querySelector("[data-evamats-compare]");
    var savingsEl = root.querySelector("[data-evamats-savings]");
    var basePrice = root.dataset.basePriceCents
      ? parseInt(root.dataset.basePriceCents, 10) / 100
      : 0;
    var currency = root.dataset.currency || "EUR";
    var locale = root.dataset.locale || undefined;

    if (compareEl) {
      compareEl.textContent = formatMoney(basePrice, currency, locale);
      compareEl.style.visibility = "visible";
      compareEl.style.textDecoration = "line-through";
    }
    if (saleEl) {
      saleEl.textContent = formatMoney(best.finalPrice, currency, locale);
      saleEl.setAttribute(
        "data-discounted-price",
        String((best.finalPrice || 0).toFixed(2)),
      );
      saleEl.style.display = "inline-flex";
    }
    if (savingsEl) {
      savingsEl.textContent = renderSavings(
        root.dataset.savingsTemplate || "Oszczędzasz -{percent}%",
        best,
        basePrice,
        currency,
        locale,
      );
      savingsEl.style.display = "";
    }
    syncOptionPrice(
      formatMoney(best.finalPrice, currency, locale),
      formatMoney(basePrice, currency, locale),
    );
    root.dataset.hasDiscount = "true";
  }

  function updateRoot(root) {
    var reqId = String((parseInt(root.dataset.evReqId || "0", 10) || 0) + 1);
    root.dataset.evReqId = reqId;
    var url = buildPreviewUrl(root);

    var request = previewCache.has(url)
      ? Promise.resolve(previewCache.get(url))
      : fetch(url, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        })
          .then(function (r) {
            if (!r.ok) throw new Error("preview " + r.status);
            return r.json();
          })
          .then(function (data) {
            previewCache.set(url, data);
            return data;
          });

    request
      .then(function (data) {
        if (root.dataset.evReqId !== reqId) return;
        if (!data || !data.hasDiscount) {
          applyNoDiscount(root);
          return;
        }
        applyDiscount(root, data);
      })
      .catch(function () {
        if (root.dataset.evReqId !== reqId) return;
        applyNoDiscount(root);
      });
  }

  function applyVariant(raw) {
    if (!raw || raw.id == null) return;
    var idStr = String(raw.id);
    var gid =
      idStr.indexOf("gid://") === 0
        ? idStr
        : "gid://shopify/ProductVariant/" + idStr;

    document.querySelectorAll("[data-evamats-discount]").forEach(function (root) {
      if (
        root.dataset.variantId === gid &&
        (raw.title == null || root.dataset.variantTitle === String(raw.title)) &&
        (raw.price == null || root.dataset.basePriceCents === String(raw.price))
      ) {
        return;
      }
      root.dataset.variantId = gid;
      if (raw.title != null) root.dataset.variantTitle = String(raw.title);
      if (raw.price != null) {
        root.dataset.basePriceCents = String(raw.price);
        var currency = root.dataset.currency || "EUR";
        var locale = root.dataset.locale || undefined;
        var quickMoney = formatMoney(parseInt(String(raw.price), 10) / 100, currency, locale);
        syncOptionPrice(quickMoney, null);
      }
      updateRoot(root);
    });
  }

  function getCurrentVariantFromDom() {
    var host = document.querySelector("variant-selects, variant-radios");
    if (host && host.currentVariant) return host.currentVariant;
    return null;
  }

  function applyCurrentVariantFallback(fallbackVariant) {
    var current = getCurrentVariantFromDom();
    applyVariant(current || fallbackVariant);
  }

  document.addEventListener("variant:change", function (e) {
    var v = e && e.detail && e.detail.variant;
    setTimeout(function () {
      applyCurrentVariantFallback(v);
    }, 0);
  });

  if (typeof window.subscribe === "function") {
    try {
      window.subscribe("variant-change", function (event) {
        var v = event && event.data && event.data.variant;
        setTimeout(function () {
          applyCurrentVariantFallback(v);
        }, 0);
      });
    } catch (e) {
      // ignore
    }
  }

  document.addEventListener("change", function (e) {
    var host = e.target && e.target.closest
      ? e.target.closest("variant-selects, variant-radios")
      : null;
    if (!host) return;
    setTimeout(function () {
      if (host.currentVariant) applyVariant(host.currentVariant);
    }, 200);
  });

  document.querySelectorAll("[data-evamats-discount]").forEach(function (root) {
    updateRoot(root);
  });

  setTimeout(function () {
    var current = getCurrentVariantFromDom();
    if (current) applyVariant(current);
  }, 0);

})();
