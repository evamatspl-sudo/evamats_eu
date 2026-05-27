(function () {
    // Находим все контейнеры фильтров и элемент header__car
    const filterContainers = document.querySelectorAll('.filter-container-json');
    const headerCar = document.querySelector('.header__car--desktop');
    const headerCarBrand = headerCar.querySelector('.header__car_info_brand');
    const headerCarModel = headerCar.querySelector('.header__car_info_model');
    const headerCarYear = headerCar.querySelector('.header__car_info_year');


    if (!filterContainers.length || !headerCar || !headerCarBrand || !headerCarModel || !headerCarYear) {
        console.warn('Required elements not found:', { filterContainers, headerCar, headerCarBrand, headerCarModel, headerCarYear });
        return;
    }

    // Обновляем header__car на основе данных из localStorage
    function updateHeaderCar() {
        const saved = localStorage.getItem('carFilterSelections');
        if (!saved) {
            headerCarBrand.textContent = '';
            headerCarModel.textContent = '';
            headerCarYear.textContent = '';
            headerCar.classList.remove('active');
            return;
        }

        try {
            const { brand, model, years } = JSON.parse(saved);
            headerCarBrand.textContent = (brand || '').trim();
            headerCarModel.textContent = (model || '').trim();
            headerCarYear.textContent = (years || '').trim();
            // Добавляем класс active, если есть хотя бы одно непустое значение
            const hasData = !!(brand || model || years);
            headerCar.classList.toggle('active', hasData);
        } catch (error) {
            console.error('Error parsing localStorage for header__car:', error);
            headerCarBrand.textContent = '';
            headerCarModel.textContent = '';
            headerCarYear.textContent = '';
            headerCar.classList.remove('active');
        }
    }

    // Вызываем при загрузке страницы
    updateHeaderCar();

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

    // Обрабатываем каждый контейнер фильтра
    filterContainers.forEach((container, index) => {
        // Находим элементы внутри текущего контейнера
        const brandCustomSelect = container.querySelector('.brand-custom-select');
        const brandSelectOptions = container.querySelector('.brand-select-options');
        const modelCustomSelect = container.querySelector('.model-custom-select');
        const modelSelectOptions = container.querySelector('.model-select-options');
        const yearsCustomSelect = container.querySelector('.years-custom-select');
        const yearsSelectOptions = container.querySelector('.years-select-options');
        const clearFilters = container.querySelector('.clear-filters');
        const searchButton = container.querySelector('.search-button-json');
        const brandsModelsJsonUrl = container.dataset.json;

        let localJson;

        // Загружаем данные для брендов и моделей
        fetch(brandsModelsJsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} while loading ${brandsModelsJsonUrl}`);
                }
                return response.text();
            })
            .then(async (rawText) => {
                let data;
                try {
                    data = JSON.parse(rawText);
                } catch (parseError) {
                    const match = String(parseError && parseError.message || '').match(/position\s+(\d+)/i);
                    const position = match ? parseInt(match[1], 10) : -1;
                    if (position >= 0) {
                        const start = Math.max(0, position - 120);
                        const end = Math.min(rawText.length, position + 120);
                        const before = rawText.slice(start, position);
                        const after = rawText.slice(position, end);
                        console.error('Error parsing JSON at position:', position);
                        console.error('JSON fragment before error:', before);
                        console.error('JSON fragment after error:', after);
                    }
                    throw parseError;
                }

                localJson = data;
                populateBrandDropdown(localJson);
                await restoreSelectionsFromLocalStorage();
                updateHeaderCar(); // Обновляем после восстановления
            })
            .catch(error => console.error('Error loading JSON:', error));

        function sortLocale(a, b) {
            return String(a).trim().localeCompare(String(b).trim(), undefined, { sensitivity: 'base', numeric: true });
        }

        function populateBrandDropdown(data) {
            brandSelectOptions.innerHTML = '';
            Object.keys(data).sort(sortLocale).forEach(brand => {
                const div = document.createElement('div');
                div.textContent = brand.trim();
                div.dataset.brand = brand;
                div.addEventListener('click', function () {
                    selectOption(this, brandCustomSelect, brandSelectOptions, true);
                    resetModelSelect();
                    const key = this.dataset.brand;
                    if (key && data[key] && Array.isArray(data[key].models)) {
                        populateModelDropdown(data[key].models);
                    }
                    enableModelSelect();
                });
                brandSelectOptions.appendChild(div);
            });
        }

        function populateModelDropdown(models) {
            modelSelectOptions.innerHTML = '';
            models.slice().sort((a, b) => sortLocale(a.name || '', b.name || '')).forEach(model => {
                const div = document.createElement('div');
                div.textContent = (model.name || '').trim();
                const url = (model.url || '').trim();
                div.dataset.url = url;
                div.addEventListener('click', function () {
                    selectOption(this, modelCustomSelect, modelSelectOptions, true);
                    enableFilters();
                    fetchAndPopulateFilters(url);
                });
                modelSelectOptions.appendChild(div);
            });
        }

        async function fetchAndPopulateFilters(collectionUrl) {
            let allProducts = [];
            let currentPage = 1;
            let totalPages = 1;

            const fetchPage = async (page) => {
                const url = `${collectionUrl}?page=${page}&view=json`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                return data;
            };

            try {
                const firstPageData = await fetchPage(1);
                allProducts = allProducts.concat(firstPageData.products);
                totalPages = Math.ceil(firstPageData.total_products / firstPageData.products.length);

                for (let page = 2; page <= totalPages; page++) {
                    const data = await fetchPage(page);
                    allProducts = allProducts.concat(data.products);
                }

                let years = new Set();
                allProducts.forEach(product => {
                    if (product.years != null && String(product.years).trim() !== '') {
                        years.add(String(product.years).trim());
                    }
                });

                populateYearsDropdown([...years]);

                // Восстанавливаем год после заполнения списка
                const saved = localStorage.getItem('carFilterSelections');
                if (saved) {
                    const { years: savedYears } = JSON.parse(saved);
                    if (savedYears) {
                        const yearDiv = Array.from(yearsSelectOptions.children).find(div => div.textContent.trim() === (savedYears || '').trim());
                        if (yearDiv) {
                            selectOption(yearDiv, yearsCustomSelect, yearsSelectOptions, false);
                        } else {
                            console.warn(`Saved year "${savedYears}" not found in available years:`, [...years]);
                            yearsCustomSelect.querySelector('.select-selected').value = '';
                            yearsCustomSelect.classList.remove('selected');
                        }
                    }
                    updateHeaderCar(); // Обновляем после попытки восстановления years
                }
            } catch (error) {
                console.error('Error fetching collection products:', error);
            }
        }

        function populateYearsDropdown(years) {
            yearsSelectOptions.innerHTML = '';
            years.sort(sortLocale).forEach(year => {
                const div = document.createElement('div');
                div.textContent = String(year).trim();
                div.addEventListener('click', function () {
                    selectOption(this, yearsCustomSelect, yearsSelectOptions, true);
                });
                yearsSelectOptions.appendChild(div);
            });
        }

        function selectOption(element, selectWrapper, selectOptions, saveToLocalStorage) {
            const selected = selectWrapper.querySelector('.select-selected');
            selected.value = (element.textContent || '').trim();
            selected.dataset.url = (element.dataset.url || '').trim();
            selectOptions.classList.add('select-hide');
            selectWrapper.classList.add('selected');
            checkIfSearchEnabled();
            closeAllSelects();
            if (saveToLocalStorage) {
                saveSelectionsToLocalStorage();
            }
        }

        function buildUrl() {
            const modelElement = modelCustomSelect.querySelector('.select-selected');
            const modelUrl = modelElement.dataset.url;
            const urlParams = new URLSearchParams();

            const years = yearsCustomSelect.querySelector('.select-selected').value;
            if (years) {
                urlParams.set('filter.p.m.custom.filter_years', years);
            }

            const queryString = urlParams.toString();
            return modelUrl + (queryString ? '?' + queryString : '');
        }

        function resetModelSelect() {
            modelCustomSelect.querySelector('.select-selected').value = '';
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
            const selectItems = container.querySelectorAll('.select-items');
            selectItems.forEach(item => item.classList.add('select-hide'));
        }

        function toggleSelectOptions(selectOptions) {
            selectOptions.classList.toggle('select-hide');
        }

        // Привязка событий
        container.querySelector('.brand-input').addEventListener('click', () => toggleSelectOptions(brandSelectOptions));
        container.querySelector('.model-input').addEventListener('click', () => toggleSelectOptions(modelSelectOptions));
        container.querySelector('.years-input').addEventListener('click', () => toggleSelectOptions(yearsSelectOptions));

        container.addEventListener('click', (event) => {
            if (!event.target.closest('.custom-select-wrapper')) {
                closeAllSelects();
            }
        });

        clearFilters.addEventListener('click', () => {
            brandCustomSelect.querySelector('.select-selected').value = '';
            modelCustomSelect.querySelector('.select-selected').value = '';
            yearsCustomSelect.querySelector('.select-selected').value = '';
            localStorage.removeItem('carFilterSelections');
            closeAllSelects();
            checkIfSearchEnabled();
            updateHeaderCar(); // Обновляем header__car после очистки
        });

        searchButton.addEventListener('click', () => {
            const url = buildUrl();
            window.location.href = url;
        });

        function checkIfSearchEnabled() {
            const selectedBrand = (brandCustomSelect.querySelector('.select-selected').value || '').trim();
            const selectedModel = (modelCustomSelect.querySelector('.select-selected').value || '').trim();
            searchButton.disabled = !(selectedBrand && selectedModel);
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
                    for (let div of divs) {
                        div.style.display = '';
                    }
                    return;
                }
                const year = parseInt(val, 10);
                if (isNaN(year)) {
                    for (let div of divs) {
                        div.style.display = 'none';
                    }
                    return;
                }
                for (let div of divs) {
                    const txt = (div.textContent || '').trim();
                    const r = parseYearRangeForVehicleFilter(txt);
                    if (r && year >= r.start && year <= r.end) {
                        div.style.display = '';
                    } else {
                        div.style.display = 'none';
                    }
                }
            } else {
                let filter = input.value.toLowerCase().replace(/s/g, '[sš]');
                for (let div of divs) {
                    const txtValue = ((div.textContent || div.innerText) || '').trim();
                    const regex = new RegExp(filter, 'i');
                    div.style.display = regex.test(txtValue) ? '' : 'none';
                }
                if (inputClass === '.brand-input' && input.value.trim() === '') {
                    container.querySelector('.model-input').setAttribute('disabled', true);
                }
            }
        }

        function saveSelectionsToLocalStorage() {
            const selections = {
                brand: (brandCustomSelect.querySelector('.select-selected').value || '').trim(),
                model: (modelCustomSelect.querySelector('.select-selected').value || '').trim(),
                modelUrl: (modelCustomSelect.querySelector('.select-selected').dataset.url || '').trim(),
                years: (yearsCustomSelect.querySelector('.select-selected').value || '').trim()
            };
            localStorage.setItem('carFilterSelections', JSON.stringify(selections));
            updateHeaderCar(); // Обновляем header__car сразу после записи
        }

        async function restoreSelectionsFromLocalStorage() {
            const saved = localStorage.getItem('carFilterSelections');
            if (!saved) {
                updateHeaderCar();
                return;
            }

            const { brand, model, modelUrl } = JSON.parse(saved);

            if (brand) {
                const brandDiv = Array.from(brandSelectOptions.children).find(div => div.textContent.trim() === (brand || '').trim());
                if (brandDiv) {
                    const brandKey = brandDiv.dataset.brand;
                    selectOption(brandDiv, brandCustomSelect, brandSelectOptions, false);
                    resetModelSelect();
                    if (brandKey && localJson[brandKey] && Array.isArray(localJson[brandKey].models)) {
                        populateModelDropdown(localJson[brandKey].models);
                        enableModelSelect();
                    }
                }
            }

            if (model && modelUrl) {
                const modelDiv = Array.from(modelSelectOptions.children).find(div => div.textContent.trim() === (model || '').trim());
                if (modelDiv) {
                    modelDiv.dataset.url = (modelUrl || '').trim();
                    selectOption(modelDiv, modelCustomSelect, modelSelectOptions, false);
                    enableFilters();
                    await fetchAndPopulateFilters(modelUrl); // Восстановление years происходит здесь
                }
            }
        }
    });
})();
