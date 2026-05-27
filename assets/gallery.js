document.addEventListener('DOMContentLoaded', function () {
    const galleryContainer = document.querySelector('.gallery__container');
    const message = document.querySelector('.gallery__message');
    const resetButton = document.querySelector('.gallery__reset');
    const edgeTabs = document.querySelectorAll('.gallery__tabs_edges .gallery__tabs_item');
    const images = document.querySelectorAll('.gallery__container .gallery__image');
  
    // Фильтрация по типу кузова и edges
    let selectedType = '';
    let selectedEdge = ''; // по умолчанию ни одна опция edges не выбрана
    let lastValidEdge = 'withEdges'; // Храним последний валидный выбор edges
  
    const bodyTypeMapping = {
      'Coupe': ['2os'],
      'Roadster': ['2os'],
      'Convertible': ['2os', '5os'],
      'Sedan': ['5os'],
      'Hatchback': ['5os'],
      'Station Wagon': ['5os', '7os'],
      'SUV': ['7os'],
      'Bus': ['bus'],
      'TIR': ['tir'],
      'VAN': ['van_big', 'van_small'],
      'Camper': ['van_big'],
      'Tractor': ['tractors'],
      'Pickup': ['pickup'],
      'Minivan': ['minivan']
    };
  
    // Типы кузова, у которых отсутствует фильтр edges
    const noEdgeTypes = ['Bus', 'TIR', 'Camper', 'Tractor', 'Minivan'];
  
    /* ========= Кастомный селект для типов кузова ========= */
    const typeSelect = document.querySelector('.gallery__tabs_types.eva__tabs');
    if (typeSelect) {
      // Если в селекте нет заголовка, создаём его и оборачиваем опции
      let selectHeader = typeSelect.querySelector('.select-header');
      if (!selectHeader) {
        selectHeader = document.createElement('div');
        selectHeader.classList.add('select-header');
        selectHeader.textContent = selectHeader.dataset.text;
        typeSelect.insertBefore(selectHeader, typeSelect.firstChild);
        const optionsContainer = document.createElement('div');
        optionsContainer.classList.add('select-options');
        const options = typeSelect.querySelectorAll('.eva__tabs_item.gallery__tabs_item');
        options.forEach(opt => {
          optionsContainer.appendChild(opt);
        });
        typeSelect.appendChild(optionsContainer);
      }
      // Открытие/закрытие селекта
      selectHeader.addEventListener('click', function (e) {
        e.stopPropagation();
        typeSelect.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!typeSelect.contains(e.target)) {
          typeSelect.classList.remove('open');
        }
      });
      // Обработка клика по опции селекта
      const typeOptions = typeSelect.querySelectorAll('.select-options .eva__tabs_item.gallery__tabs_item');
      typeOptions.forEach(option => {
        option.addEventListener('click', function (e) {
          e.stopPropagation();
          selectedType = this.dataset.type;
          selectHeader.textContent = this.textContent.trim();
          typeOptions.forEach(opt => opt.classList.remove('active'));
          this.classList.add('active');
          typeSelect.classList.remove('open');
          // Если выбран тип с поддержкой edges – восстанавливаем сохранённое значение, иначе сбрасываем
          if (!noEdgeTypes.includes(selectedType)) {
            selectedEdge = lastValidEdge;
          } else {
            selectedEdge = '';
          }
          filterImages();
        });
      });
    }
  
    /* ========= Обработка кликов по кнопкам edges ========= */
    edgeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('disabled')) return;
        selectedEdge = tab.dataset.type;
        lastValidEdge = selectedEdge; // сохраняем выбор
        edgeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filterImages();
      });
    });
  
    /* ========= Функция перемещения элементов в галерее ========= */
    function reorderGallery(relevantWrappers, nonRelevantWrappers) {
      galleryContainer.innerHTML = '';
      // Сначала релевантные обёртки
      relevantWrappers.forEach(wrapper => {
        galleryContainer.appendChild(wrapper);
      });
      // Если есть нерелевантные, вставляем разделитель
      if (nonRelevantWrappers.length > 0) {
        const divider = document.createElement('div');
        const dividerText = document.querySelector('.gallery__divider_text').textContent;
        divider.style.width = '100%';
        divider.style.textAlign = 'center';
        divider.style.padding = '10px 0';
        divider.textContent = dividerText;
        galleryContainer.appendChild(divider);
        nonRelevantWrappers.forEach(wrapper => {
          galleryContainer.appendChild(wrapper);
        });
      }
    }
  
    /* ========= Функция фильтрации ========= */
    function filterImages() {
      let relevantWrappers = [];
      let nonRelevantWrappers = [];
      let hasRelevant = false;
  
      // Управление состоянием кнопок edges
      if (selectedType) {
        if (noEdgeTypes.includes(selectedType)) {
          lastValidEdge = selectedEdge || lastValidEdge;
          selectedEdge = '';
          edgeTabs.forEach(tab => tab.classList.add('disabled'));
        } else {
          edgeTabs.forEach(tab => tab.classList.remove('disabled'));
          if (!selectedEdge) {
            selectedEdge = lastValidEdge;
          }
        }
      } else {
        edgeTabs.forEach(tab => tab.classList.remove('disabled'));
      }
  
      edgeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === selectedEdge);
      });
  
      // Перебор всех изображений
      images.forEach(image => {
        const wrapper = image.closest('.gallery__image_wr');
        const dataType = image.dataset.type;
        let matchesType = selectedType
          ? (bodyTypeMapping[selectedType] || []).some(subType => dataType.includes(subType))
          : true;
        let matchesEdge = true;
        if (selectedEdge) {
          if (selectedEdge === 'withoutEdges') {
            matchesEdge = !dataType.includes('_edges');
          } else if (selectedEdge === 'withEdges') {
            matchesEdge = dataType.includes('_edges');
          }
        }
        if (matchesType && matchesEdge) {
          relevantWrappers.push(wrapper);
          hasRelevant = true;
        } else {
          nonRelevantWrappers.push(wrapper);
        }
      });
  
      message.classList.toggle('hidden', hasRelevant);
      reorderGallery(relevantWrappers, nonRelevantWrappers);
    }
  
    /* ========= Обработка кнопки сброса ========= */
    resetButton.addEventListener('click', () => {
      selectedType = '';
      selectedEdge = '';
      lastValidEdge = 'withEdges';
  
      // Сброс кастомного селекта для типов кузова
      if (typeSelect) {
        const selectHeader = typeSelect.querySelector('.select-header');
        selectHeader.textContent = selectHeader.dataset.text;
        typeSelect.classList.remove('open');
        const typeOptions = typeSelect.querySelectorAll('.select-options .eva__tabs_item.gallery__tabs_item');
        typeOptions.forEach(opt => opt.classList.remove('active'));
      }
      // Сброс вкладок edges
      edgeTabs.forEach(t => t.classList.remove('active', 'disabled'));
      filterImages();
    });
  
    /* ========= Первоначальный запуск фильтрации ========= */
    filterImages();
  
    Fancybox.bind("[data-fancybox]", {
      animated: false
    });
  });
  