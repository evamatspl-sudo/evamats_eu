(function () {
    const DEFAULT_FILES_CDN = 'https://cdn.shopify.com/s/files/1/0790/9218/7414/files/';
    const filterContainers = document.querySelectorAll('.filter-container-json');

    // Catalog-wide collections that must show an empty vehicle filter (no brand/model preselected).
    const EMPTY_FILTER_HANDLES = ['all', 'all-car-mats'];
    const brandsJsonPromises = window.__evamatsAllBrandsJsonPromises || (window.__evamatsAllBrandsJsonPromises = {});

    if (!filterContainers.length) {
        return;
    }

    function loadBrandsJson(url) {
        if (!url) {
            return Promise.reject(new Error('Missing all_brands.json URL'));
        }
        if (!brandsJsonPromises[url]) {
            brandsJsonPromises[url] = fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} while loading ${url}`);
                    }
                    return response.text();
                })
                .then((rawText) => {
                    try {
                        return JSON.parse(rawText);
                    } catch (parseError) {
                        const match = String(parseError && parseError.message || '').match(/position\s+(\d+)/i);
                        const position = match ? parseInt(match[1], 10) : -1;
                        if (position >= 0) {
                            const start = Math.max(0, position - 120);
                            const end = Math.min(rawText.length, position + 120);
                            console.error('Error parsing JSON at position:', position);
                            console.error('JSON fragment before error:', rawText.slice(start, position));
                            console.error('JSON fragment after error:', rawText.slice(position, end));
                        }
                        throw parseError;
                    }
                });
        }
        return brandsJsonPromises[url];
    }

    function needsEagerBrandsLoad(container) {
        return (
            container.dataset.filterUi === 'hero' ||
            container.dataset.filterUi === 'collection' ||
            container.dataset.autoNavigate === 'true' ||
            Boolean((container.dataset.collectionHandle || '').trim())
        );
    }

    function scheduleBrandsLoad(startLoad) {
        let started = false;
        const run = () => {
            if (started) return;
            started = true;
            startLoad();
        };

        const hasEager = Array.from(filterContainers).some(needsEagerBrandsLoad);
        if (hasEager) {
            run();
            return run;
        }

        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 2000 });
        } else {
            window.addEventListener('load', run, { once: true });
            setTimeout(run, 2000);
        }

        document.addEventListener(
            'click',
            (event) => {
                if (
                    event.target.closest('.header__car') ||
                    event.target.closest('.filter-container-json')
                ) {
                    run();
                }
            },
            true
        );
        document.addEventListener(
            'focusin',
            (event) => {
                if (event.target.closest('.filter-container-json .brand-input')) {
                    run();
                }
            },
            true
        );

        return run;
    }

    function shouldStartEmpty(container) {
        const handle = (container.dataset.collectionHandle || '').trim().toLowerCase();
        return EMPTY_FILTER_HANDLES.includes(handle);
    }

    function getFilesCdn(container) {
        const base = container.dataset.filesCdn || DEFAULT_FILES_CDN;
        return base.endsWith('/') ? base : `${base}/`;
    }

    function fileUrl(container, filename) {
        const name = String(filename || '').trim();
        if (!name) return '';
        return getFilesCdn(container) + name;
    }

    function isHeroFilter(container) {
        return container.dataset.filterUi === 'hero';
    }

    function allowsFilterThumbs(container) {
        const ui = container.dataset.filterUi;
        return ui === 'hero' || ui === 'collection';
    }

    function findGeneration(years, generations) {
        if (!Array.isArray(generations) || !years) return null;
        const value = String(years).trim();
        return generations.find((item) => item && String(item.years).trim() === value) || null;
    }

    function formatGenerationLabel(generation, years) {
        const yearLabel = String(years || '').trim();
        if (!generation || !generation.code) return yearLabel;
        return `${String(generation.code).trim()} · ${yearLabel}`;
    }

    function parseYearRangeForVehicleFilter(text) {
        const normalized = String(text || '').trim().replace(/\u2013|\u2014|\u2212/g, '-');
        const range = normalized.match(/(\d{4})\s*-\s*(\d{4})/);
        if (range) {
            let a = parseInt(range[1], 10);
            let b = parseInt(range[2], 10);
            if (isNaN(a) || isNaN(b)) return null;
            if (a > b) {
                const tmp = a;
                a = b;
                b = tmp;
            }
            return { start: a, end: b };
        }
        const single = normalized.match(/^(\d{4})$/);
        if (single) {
            const y = parseInt(single[1], 10);
            return isNaN(y) ? null : { start: y, end: y };
        }
        return null;
    }

    function slugifyBrand(name) {
        return String(name || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
    }

    function extractCollectionHandle(url) {
        return String(url || '')
            .trim()
            .replace(/^\/collections\//, '')
            .split('?')[0]
            .toLowerCase();
    }

    function resolveBrandCollectionUrl(brandKey, brandData) {
        if (brandData && brandData.url) {
            return String(brandData.url).trim();
        }
        return `/collections/${slugifyBrand(brandKey)}`;
    }

    function getYearsFilterFromUrl() {
        return new URLSearchParams(window.location.search).get('filter.p.m.custom.filter_years') || '';
    }

    function buildFilterUrl(modelUrl, years) {
        const path = String(modelUrl || '').trim();
        if (!path) return '';
        const url = new URL(path, window.location.origin);
        const yearsValue = String(years || '').trim();
        if (yearsValue) {
            url.searchParams.set('filter.p.m.custom.filter_years', yearsValue);
        }
        return url.pathname + url.search;
    }

    function isSameFilterLocation(targetUrl) {
        const target = new URL(String(targetUrl || '').trim(), window.location.origin);
        const current = window.location;
        return target.pathname === current.pathname && target.search === current.search;
    }

    function navigateIfNeeded(targetUrl) {
        const url = String(targetUrl || '').trim();
        if (!url || isSameFilterLocation(url)) return;
        window.location.href = url;
    }

    function normalizeCatalogLabel(value) {
        return String(value || '')
            .trim()
            .toLocaleLowerCase()
            .replace(/\s+/g, ' ');
    }

    function findCatalogMatch(catalog, handle, brandHint, modelHint) {
        const normalizedHandle = String(handle || '').trim().toLowerCase();
        const normalizedBrandHint = normalizeCatalogLabel(brandHint);
        const normalizedModelHint = normalizeCatalogLabel(modelHint);
        if (!catalog) return null;

        let brandMatch = null;
        let modelMatch = null;
        let hintedBrandMatch = null;
        let hintedModelMatch = null;

        Object.keys(catalog).forEach((brandKey) => {
            const brandData = catalog[brandKey];
            const cleanBrandKey = String(brandKey || '').trim();
            const brandHandle = extractCollectionHandle(resolveBrandCollectionUrl(cleanBrandKey, brandData));
            const brandCandidate = { brandKey, brandData, level: 'brand' };

            if (brandHandle === normalizedHandle) {
                brandMatch = brandCandidate;
            }
            if (
                normalizedBrandHint &&
                normalizeCatalogLabel(cleanBrandKey) === normalizedBrandHint
            ) {
                hintedBrandMatch = brandCandidate;
            }

            if (!brandData || !Array.isArray(brandData.models)) return;

            brandData.models.forEach((model) => {
                const modelHandle = extractCollectionHandle(model.url);
                const candidate = {
                    brandKey,
                    brandData,
                    model,
                    modelUrl: model.url,
                    level: 'model'
                };

                if (modelHandle === normalizedHandle) {
                    if (
                        !modelMatch ||
                        modelHandle.length > extractCollectionHandle(modelMatch.model.url).length
                    ) {
                        modelMatch = candidate;
                    }
                }

                if (
                    normalizedBrandHint &&
                    normalizedModelHint &&
                    normalizeCatalogLabel(cleanBrandKey) === normalizedBrandHint &&
                    normalizeCatalogLabel(model.name) === normalizedModelHint
                ) {
                    hintedModelMatch = candidate;
                }
            });
        });

        return modelMatch || brandMatch || hintedModelMatch || hintedBrandMatch;
    }

    function isAutoNavigate(container) {
        return container.dataset.autoNavigate === 'true';
    }

    filterContainers.forEach((container) => {
        const brandCustomSelect = container.querySelector('.brand-custom-select');
        const brandSelectOptions = container.querySelector('.brand-select-options');
        const modelCustomSelect = container.querySelector('.model-custom-select');
        const modelSelectOptions = container.querySelector('.model-select-options');
        const yearsCustomSelect = container.querySelector('.years-custom-select');
        const yearsSelectOptions = container.querySelector('.years-select-options');
        const clearFilters = container.querySelector('.clear-filters');
        const searchButton = container.querySelector('.search-button-json');
        const brandsModelsJsonUrl = container.dataset.json;
        const heroUi = isHeroFilter(container);

        let localJson;
        let selectedBrandLogo = '';
        let selectedModelGenerations = null;
        let suppressAutoNav = false;
        const autoNavEnabled = isAutoNavigate(container);

        function maybeNavigate(targetUrl) {
            if (!autoNavEnabled || suppressAutoNav) return;
            navigateIfNeeded(targetUrl);
        }

        let brandsLoadStarted = false;
        let brandsDataApplied = false;

        function setBrandOptionsLoading(isLoading) {
            if (!brandSelectOptions) return;
            const existing = brandSelectOptions.querySelector('.brand-select-loading');
            if (isLoading) {
                if (existing || brandSelectOptions.children.length) return;
                const loading = document.createElement('div');
                loading.className = 'brand-select-loading';
                loading.setAttribute('aria-busy', 'true');
                loading.textContent = '…';
                brandSelectOptions.appendChild(loading);
                return;
            }
            if (existing) existing.remove();
        }

        async function applyBrandsData(data) {
            if (brandsDataApplied) return;
            brandsDataApplied = true;
            setBrandOptionsLoading(false);
            localJson = data;
            populateBrandDropdown(localJson);
            if (shouldStartEmpty(container)) {
                localStorage.removeItem('carFilterSelections');
                return;
            }
            const restoredFromPage = await restoreSelectionsFromPageContext();
            if (!restoredFromPage) {
                await restoreSelectionsFromLocalStorage();
            }
        }

        function startBrandsLoad() {
            if (brandsLoadStarted) return;
            brandsLoadStarted = true;
            setBrandOptionsLoading(true);
            loadBrandsJson(brandsModelsJsonUrl)
                .then(applyBrandsData)
                .catch((error) => {
                    setBrandOptionsLoading(false);
                    console.error('Error loading JSON:', error);
                });
        }

        container.__evamatsStartBrandsLoad = startBrandsLoad;

        function sortLocale(a, b) {
            return String(a).trim().localeCompare(String(b).trim(), undefined, { sensitivity: 'base', numeric: true });
        }

        function setThumb(selectWrapper, filename, type) {
            if (!allowsFilterThumbs(container)) return;
            const thumb = selectWrapper.querySelector('.filter-field__thumb');
            if (!thumb) return;

            if (filename) {
                thumb.src = fileUrl(container, filename);
                thumb.hidden = false;
                selectWrapper.classList.add('filter-field--has-media');
                if (type === 'generation') {
                    selectWrapper.classList.add('filter-field--has-generation-media');
                }
                return;
            }

            thumb.hidden = true;
            thumb.removeAttribute('src');
            selectWrapper.classList.remove('filter-field--has-media', 'filter-field--has-generation-media');
        }

        function setFieldValue(selectWrapper, displayValue, filterValue) {
            const input = selectWrapper.querySelector('.select-selected');
            if (!input) return;
            input.value = displayValue;
            if (filterValue != null) {
                input.dataset.years = filterValue;
            } else {
                delete input.dataset.years;
            }
        }

        function resetYearsSelect() {
            const yearsInput = yearsCustomSelect.querySelector('.select-selected');
            yearsInput.value = '';
            delete yearsInput.dataset.years;
            yearsSelectOptions.innerHTML = '';
            yearsCustomSelect.classList.remove('selected');
            yearsInput.classList.add('disabled');
            yearsInput.setAttribute('disabled', 'disabled');
            setThumb(yearsCustomSelect, '', 'generation');
            selectedModelGenerations = null;
        }

        function populateBrandDropdown(data) {
            brandSelectOptions.innerHTML = '';
            Object.keys(data)
                .sort(sortLocale)
                .forEach((brand) => {
                    const div = document.createElement('div');
                    div.textContent = brand.trim();
                    div.dataset.brand = brand;
                    if (data[brand] && data[brand].logo) {
                        div.dataset.logo = String(data[brand].logo).trim();
                    }
                    div.addEventListener('click', function () {
                        const key = this.dataset.brand;
                        const brandUrl = key && data[key] ? resolveBrandCollectionUrl(key, data[key]) : '';

                        if (autoNavEnabled) {
                            saveSelectionsToLocalStorage({
                                brand: (this.textContent || '').trim(),
                                model: '',
                                modelUrl: '',
                                years: ''
                            });
                            maybeNavigate(brandUrl);
                            return;
                        }

                        selectOption(this, brandCustomSelect, brandSelectOptions, true);
                        brandCustomSelect.querySelector('.select-selected').dataset.url = brandUrl;
                        selectedBrandLogo = (this.dataset.logo || '').trim();
                        selectedModelGenerations = null;
                        resetModelSelect();
                        resetYearsSelect();
                        setThumb(brandCustomSelect, selectedBrandLogo, 'brand');
                        setThumb(modelCustomSelect, '', 'generation');
                        if (key && data[key] && Array.isArray(data[key].models)) {
                            populateModelDropdown(data[key].models);
                        }
                        enableModelSelect();
                        checkIfSearchEnabled();
                    });
                    brandSelectOptions.appendChild(div);
                });
        }

        function populateModelDropdown(models) {
            modelSelectOptions.innerHTML = '';
            models
                .slice()
                .sort((a, b) => sortLocale(a.name || '', b.name || ''))
                .forEach((model) => {
                    const div = document.createElement('div');
                    div.textContent = (model.name || '').trim();
                    const url = (model.url || '').trim();
                    div.dataset.url = url;
                    if (Array.isArray(model.generations)) {
                        div.dataset.hasGenerations = '1';
                    }
                    div.addEventListener('click', function () {
                        const url = (model.url || '').trim();
                        selectedModelGenerations = Array.isArray(model.generations) ? model.generations : null;

                        if (autoNavEnabled) {
                            saveSelectionsToLocalStorage({
                                brand: (brandCustomSelect.querySelector('.select-selected').value || '').trim(),
                                model: (model.name || '').trim(),
                                modelUrl: url,
                                years: ''
                            });
                            maybeNavigate(url);
                            return;
                        }

                        selectOption(this, modelCustomSelect, modelSelectOptions, true);
                        enableFilters();
                        fetchAndPopulateFilters(url);
                    });
                    modelSelectOptions.appendChild(div);
                });
        }

        async function fetchAndPopulateFilters(collectionUrl, preferredYears) {
            const fetchPage = async (page) => {
                const url = `${collectionUrl}?page=${page}&view=json`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            };

            try {
                const firstPageData = await fetchPage(1);
                let allProducts = firstPageData.products || [];
                const perPage = firstPageData.products && firstPageData.products.length;
                const totalPages = perPage
                    ? Math.ceil(firstPageData.total_products / perPage)
                    : 1;

                for (let page = 2; page <= totalPages; page++) {
                    const data = await fetchPage(page);
                    allProducts = allProducts.concat(data.products || []);
                }

                const years = new Set();
                allProducts.forEach((product) => {
                    if (product.years != null && String(product.years).trim() !== '') {
                        years.add(String(product.years).trim());
                    }
                });

                populateYearsDropdown([...years]);

                let yearsToSelect = String(preferredYears || '').trim();
                if (!yearsToSelect) {
                    const saved = localStorage.getItem('carFilterSelections');
                    if (saved) {
                        yearsToSelect = (JSON.parse(saved).years || '').trim();
                    }
                }

                if (yearsToSelect) {
                    const yearDiv = Array.from(yearsSelectOptions.children).find(
                        (div) => (div.dataset.years || div.textContent).trim() === yearsToSelect
                    );
                    if (yearDiv) {
                        selectYearOption(yearDiv, false);
                    } else {
                        console.warn(`Year "${yearsToSelect}" not found in available years:`, [...years]);
                    }
                }
            } catch (error) {
                console.error('Error fetching collection products:', error);
            }
        }

        function buildYearOptionElement(years) {
            const generation = findGeneration(years, selectedModelGenerations);
            const div = document.createElement('div');
            const label = formatGenerationLabel(generation, years);

            div.dataset.years = years;
            if (generation && generation.code) {
                div.dataset.code = String(generation.code).trim();
            }
            if (generation && generation.image) {
                div.dataset.image = String(generation.image).trim();
            }

            if (allowsFilterThumbs(container) && generation && generation.image) {
                div.className = 'filter-option filter-option--generation';
                div.innerHTML = `
          <span class="filter-option__text">${label}</span>
          <img class="filter-option__thumb" src="${fileUrl(container, generation.image)}" alt="" width="66" height="48" loading="lazy">
        `;
            } else {
                div.textContent = label;
            }

            div.addEventListener('click', function () {
                selectYearOption(this, true);
            });

            return div;
        }

        function populateYearsDropdown(years) {
            yearsSelectOptions.innerHTML = '';
            years
                .slice()
                .sort((a, b) => {
                    const rangeA = parseYearRangeForVehicleFilter(a);
                    const rangeB = parseYearRangeForVehicleFilter(b);
                    const startA = rangeA ? rangeA.start : Number.NEGATIVE_INFINITY;
                    const startB = rangeB ? rangeB.start : Number.NEGATIVE_INFINITY;
                    if (startB !== startA) return startB - startA;
                    const endA = rangeA ? rangeA.end : Number.NEGATIVE_INFINITY;
                    const endB = rangeB ? rangeB.end : Number.NEGATIVE_INFINITY;
                    if (endB !== endA) return endB - endA;
                    return sortLocale(String(b), String(a));
                })
                .forEach((year) => {
                    yearsSelectOptions.appendChild(buildYearOptionElement(String(year).trim()));
                });
        }

        function selectYearOption(element, saveToLocalStorage) {
            const yearsValue = (element.dataset.years || element.textContent || '').trim();
            const generation = findGeneration(yearsValue, selectedModelGenerations);
            const displayValue = formatGenerationLabel(generation, yearsValue);

            setFieldValue(yearsCustomSelect, displayValue, yearsValue);
            yearsCustomSelect.dataset.url = '';
            yearsSelectOptions.classList.add('select-hide');
            yearsCustomSelect.classList.add('selected');

            if (generation && generation.image) {
                setThumb(yearsCustomSelect, generation.image, 'generation');
            } else {
                setThumb(yearsCustomSelect, '', 'generation');
            }

            checkIfSearchEnabled();
            closeAllSelects();

            if (saveToLocalStorage) {
                saveSelectionsToLocalStorage();
            }

            if (autoNavEnabled && !suppressAutoNav) {
                const modelUrl = (modelCustomSelect.querySelector('.select-selected').dataset.url || '').trim();
                maybeNavigate(buildFilterUrl(modelUrl, yearsValue));
            }
        }

        function selectOption(element, selectWrapper, selectOptions, saveToLocalStorage) {
            const selected = selectWrapper.querySelector('.select-selected');
            const label = (element.textContent || '').trim();
            selected.value = label;
            selected.dataset.url = (element.dataset.url || '').trim();
            delete selected.dataset.years;
            selectOptions.classList.add('select-hide');
            selectWrapper.classList.add('selected');
            checkIfSearchEnabled();
            closeAllSelects();

            if (saveToLocalStorage) {
                saveSelectionsToLocalStorage();
            }
        }

        function buildUrl() {
            const brandElement = brandCustomSelect.querySelector('.select-selected');
            const modelElement = modelCustomSelect.querySelector('.select-selected');
            const brandUrl = (brandElement.dataset.url || '').trim();
            const modelUrl = (modelElement.dataset.url || '').trim();
            const baseUrl = modelUrl || brandUrl;
            const urlParams = new URLSearchParams();
            const yearsInput = yearsCustomSelect.querySelector('.select-selected');
            const years = (yearsInput.dataset.years || yearsInput.value || '').trim();

            if (years) {
                urlParams.set('filter.p.m.custom.filter_years', years);
            }

            const queryString = urlParams.toString();
            return baseUrl + (queryString ? '?' + queryString : '');
        }

        function resetModelSelect() {
            const modelInput = modelCustomSelect.querySelector('.select-selected');
            modelInput.value = '';
            delete modelInput.dataset.url;
            modelSelectOptions.innerHTML = '';
            modelCustomSelect.classList.remove('selected');
        }

        function enableModelSelect() {
            const modelInput = modelCustomSelect.querySelector('.select-selected');
            modelInput.classList.remove('disabled');
            modelInput.removeAttribute('disabled');
        }

        function enableFilters() {
            const yearsInput = yearsCustomSelect.querySelector('.select-selected');
            yearsInput.classList.remove('disabled');
            yearsInput.removeAttribute('disabled');
        }

        function closeAllSelects() {
            container.querySelectorAll('.select-items').forEach((item) => item.classList.add('select-hide'));
            container.querySelectorAll('.custom-select').forEach((select) => select.classList.remove('active'));
        }

        function toggleSelectOptions(selectOptions, customSelect) {
            const isOpen = !selectOptions.classList.contains('select-hide');
            closeAllSelects();
            if (!isOpen) {
                selectOptions.classList.remove('select-hide');
                customSelect.classList.add('active');
            }
        }

        function bindSelectToggle(customSelect, selectOptions) {
            const trigger = customSelect.querySelector('.filter-field__body') || customSelect;
            trigger.addEventListener('click', (event) => {
                if (event.target.closest('.select-items')) return;

                const input = customSelect.querySelector('.select-selected');
                if (!input || input.disabled || input.classList.contains('disabled')) return;

                startBrandsLoad();
                toggleSelectOptions(selectOptions, customSelect);
                if (document.activeElement !== input) {
                    input.focus({ preventScroll: true });
                }
            });
        }

        bindSelectToggle(brandCustomSelect, brandSelectOptions);
        bindSelectToggle(modelCustomSelect, modelSelectOptions);
        bindSelectToggle(yearsCustomSelect, yearsSelectOptions);

        /* --- Крестик очистки поля: стереть значение и сразу вернуться на шаг назад --- */
        function fieldInput(customSelect) {
          return customSelect.querySelector('.select-selected');
        }

        function updateClearButtons() {
          [brandCustomSelect, modelCustomSelect, yearsCustomSelect].forEach((customSelect) => {
            const btn = customSelect.querySelector('[data-filter-clear]');
            if (!btn) return;
            const input = fieldInput(customSelect);
            btn.hidden = !(input && (input.value || '').trim());
          });
        }

        function bindFieldClear(customSelect, kind) {
          const btn = customSelect.querySelector('[data-filter-clear]');
          if (!btn) return;

          btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (kind === 'years') {
              const modelUrl = ((fieldInput(modelCustomSelect) || {}).dataset || {}).url || '';
              resetYearsSelect();
              closeAllSelects();
              checkIfSearchEnabled();
              updateClearButtons();
              if (autoNavEnabled && modelUrl.trim()) window.location.href = modelUrl.trim();
              return;
            }

            if (kind === 'model') {
              const brandUrl = ((fieldInput(brandCustomSelect) || {}).dataset || {}).url || '';
              resetModelSelect();
              resetYearsSelect();
              setThumb(modelCustomSelect, '', 'generation');
              closeAllSelects();
              checkIfSearchEnabled();
              updateClearButtons();
              if (autoNavEnabled && brandUrl.trim()) window.location.href = brandUrl.trim();
              return;
            }

            clearFilters.click();
            updateClearButtons();
          });
        }

        bindFieldClear(brandCustomSelect, 'brand');
        bindFieldClear(modelCustomSelect, 'model');
        bindFieldClear(yearsCustomSelect, 'years');

        container.addEventListener('click', () => setTimeout(updateClearButtons, 60));
        container.addEventListener('input', () => setTimeout(updateClearButtons, 60));
        setTimeout(updateClearButtons, 300);
        setTimeout(updateClearButtons, 1200);

        document.addEventListener('click', (event) => {
            const wrapper = event.target.closest('.custom-select-wrapper');
            if (!wrapper || !container.contains(wrapper)) {
                closeAllSelects();
            }
        });

        clearFilters.addEventListener('click', () => {
            const brandInput = brandCustomSelect.querySelector('.select-selected');
            brandInput.value = '';
            delete brandInput.dataset.url;
            modelCustomSelect.querySelector('.select-selected').value = '';
            resetYearsSelect();
            selectedBrandLogo = '';
            setThumb(brandCustomSelect, '', 'brand');
            setThumb(modelCustomSelect, '', 'generation');
            brandCustomSelect.classList.remove('selected');
            modelCustomSelect.classList.remove('selected');
            localStorage.removeItem('carFilterSelections');
            closeAllSelects();
            checkIfSearchEnabled();
        });

        searchButton.addEventListener('click', () => {
            window.location.href = buildUrl();
        });

        function checkIfSearchEnabled() {
            const selectedBrand = (brandCustomSelect.querySelector('.select-selected').value || '').trim();
            const brandUrl = (brandCustomSelect.querySelector('.select-selected').dataset.url || '').trim();
            searchButton.disabled = !(selectedBrand && brandUrl);
        }

        container.querySelector('.brand-input').addEventListener('input', () => filterSelectOptions('.brand-input', '.brand-select-options'));
        container.querySelector('.model-input').addEventListener('input', () => filterSelectOptions('.model-input', '.model-select-options'));
        container.querySelector('.years-input').addEventListener('input', () => filterSelectOptions('.years-input', '.years-select-options'));

        function filterSelectOptions(inputClass, optionsClass) {
            const input = container.querySelector(inputClass);
            const divs = container.querySelector(optionsClass).getElementsByTagName('div');

            if (inputClass === '.years-input') {
                const val = input.value.trim();
                if (!val) {
                    for (const div of divs) {
                        div.style.display = '';
                    }
                    return;
                }
                const year = parseInt(val, 10);
                if (isNaN(year)) {
                    for (const div of divs) {
                        div.style.display = 'none';
                    }
                    return;
                }
                for (const div of divs) {
                    const txt = (div.dataset.years || div.textContent || '').trim();
                    const r = parseYearRangeForVehicleFilter(txt);
                    div.style.display = r && year >= r.start && year <= r.end ? '' : 'none';
                }
                return;
            }

            let filter = input.value.toLowerCase().replace(/s/g, '[sš]');
            for (const div of divs) {
                const txtValue = ((div.textContent || div.innerText) || '').trim();
                const regex = new RegExp(filter, 'i');
                div.style.display = regex.test(txtValue) ? '' : 'none';
            }
            if (inputClass === '.brand-input' && input.value.trim() === '') {
                container.querySelector('.model-input').setAttribute('disabled', 'disabled');
            }
        }

        function saveSelectionsToLocalStorage(override) {
            const yearsInput = yearsCustomSelect.querySelector('.select-selected');
            const selections = override || {
                brand: (brandCustomSelect.querySelector('.select-selected').value || '').trim(),
                model: (modelCustomSelect.querySelector('.select-selected').value || '').trim(),
                modelUrl: (modelCustomSelect.querySelector('.select-selected').dataset.url || '').trim(),
                years: (yearsInput.dataset.years || yearsInput.value || '').trim()
            };
            localStorage.setItem('carFilterSelections', JSON.stringify(selections));
        }

        async function restoreBrandSelection(brandKey, brandData, saveToStorage) {
            const brandDiv = Array.from(brandSelectOptions.children).find(
                (div) => (div.dataset.brand || div.textContent || '').trim() === String(brandKey).trim()
            );
            if (!brandDiv) return false;

            selectedBrandLogo = (brandDiv.dataset.logo || '').trim();
            if (!selectedBrandLogo && brandData && brandData.logo) {
                selectedBrandLogo = String(brandData.logo).trim();
            }

            selectOption(brandDiv, brandCustomSelect, brandSelectOptions, saveToStorage);
            brandCustomSelect.querySelector('.select-selected').dataset.url = resolveBrandCollectionUrl(
                brandKey,
                brandData
            );
            setThumb(brandCustomSelect, selectedBrandLogo, 'brand');
            resetModelSelect();
            resetYearsSelect();

            if (brandData && Array.isArray(brandData.models)) {
                populateModelDropdown(brandData.models);
                enableModelSelect();
            }

            checkIfSearchEnabled();
            return true;
        }

        async function restoreModelSelection(brandKey, brandData, model, modelUrl, saveToStorage) {
            const modelName = (model.name || '').trim();
            const modelDiv = Array.from(modelSelectOptions.children).find(
                (div) => (div.textContent || '').trim() === modelName
            );
            if (!modelDiv) return false;

            modelDiv.dataset.url = String(modelUrl || model.url || '').trim();
            const modelData = brandData && Array.isArray(brandData.models)
                ? brandData.models.find((item) => (item.name || '').trim() === modelName)
                : null;
            selectedModelGenerations =
                modelData && Array.isArray(modelData.generations) ? modelData.generations : null;

            selectOption(modelDiv, modelCustomSelect, modelSelectOptions, saveToStorage);
            enableFilters();
            await fetchAndPopulateFilters(modelDiv.dataset.url, getYearsFilterFromUrl());
            return true;
        }

        async function restoreSelectionsFromPageContext() {
            const handle = (container.dataset.collectionHandle || '').trim();
            if (!handle || !localJson) return false;

            const match = findCatalogMatch(
                localJson,
                handle,
                container.dataset.pageBrand,
                container.dataset.pageModel
            );
            if (!match) return false;

            suppressAutoNav = true;

            const restoredBrand = await restoreBrandSelection(match.brandKey, match.brandData, false);
            if (!restoredBrand) {
                suppressAutoNav = false;
                return false;
            }

            if (match.level === 'model' && match.model) {
                await restoreModelSelection(
                    match.brandKey,
                    match.brandData,
                    match.model,
                    match.modelUrl,
                    false
                );
            }

            saveSelectionsToLocalStorage();
            suppressAutoNav = false;
            return true;
        }

        async function restoreSelectionsFromLocalStorage() {
            const saved = localStorage.getItem('carFilterSelections');
            if (!saved) {
                return;
            }

            const { brand, model, modelUrl } = JSON.parse(saved);
            let restoredBrandKey = null;

            if (brand) {
                const brandDiv = Array.from(brandSelectOptions.children).find(
                    (div) => div.textContent.trim() === (brand || '').trim()
                );
                if (brandDiv) {
                    restoredBrandKey = brandDiv.dataset.brand;
                    selectedBrandLogo = (brandDiv.dataset.logo || '').trim();
                    if (!selectedBrandLogo && restoredBrandKey && localJson[restoredBrandKey] && localJson[restoredBrandKey].logo) {
                        selectedBrandLogo = String(localJson[restoredBrandKey].logo).trim();
                    }
                    selectOption(brandDiv, brandCustomSelect, brandSelectOptions, false);
                    if (restoredBrandKey && localJson[restoredBrandKey]) {
                        brandCustomSelect.querySelector('.select-selected').dataset.url = resolveBrandCollectionUrl(
                            restoredBrandKey,
                            localJson[restoredBrandKey]
                        );
                    }
                    setThumb(brandCustomSelect, selectedBrandLogo, 'brand');
                    resetModelSelect();
                    if (restoredBrandKey && localJson[restoredBrandKey] && Array.isArray(localJson[restoredBrandKey].models)) {
                        populateModelDropdown(localJson[restoredBrandKey].models);
                        enableModelSelect();
                    }
                }
            }

            if (model && modelUrl) {
                const modelDiv = Array.from(modelSelectOptions.children).find(
                    (div) => div.textContent.trim() === (model || '').trim()
                );
                if (modelDiv) {
                    modelDiv.dataset.url = (modelUrl || '').trim();
                    const brandKey =
                        restoredBrandKey ||
                        (brand && localJson
                            ? Object.keys(localJson).find((key) => key.trim() === String(brand).trim())
                            : null);
                    const brandData = brandKey && localJson ? localJson[brandKey] : null;
                    if (brandData && Array.isArray(brandData.models)) {
                        const modelData = brandData.models.find(
                            (item) => (item.name || '').trim() === (model || '').trim()
                        );
                        selectedModelGenerations =
                            modelData && Array.isArray(modelData.generations) ? modelData.generations : null;
                    }
                    selectOption(modelDiv, modelCustomSelect, modelSelectOptions, false);
                    enableFilters();
                    await fetchAndPopulateFilters(modelUrl);
                }
            }

            checkIfSearchEnabled();
        }
    });

    scheduleBrandsLoad(() => {
        filterContainers.forEach((container) => {
            if (typeof container.__evamatsStartBrandsLoad === 'function') {
                container.__evamatsStartBrandsLoad();
            }
        });
    });
})();
