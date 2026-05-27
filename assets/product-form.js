const DROP_CELL_SHAPE_VARIANT_ID = 51194860011798;

const addDropCellShape = async (id) => {
  try {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id, quantity: 1 }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[addDropCellShape] /cart/add.js not ok", {
        status: response.status,
        variantId: id,
        body: body || "(empty)",
      });
      throw new Error(
        `Ошибка при добавлении drop cell shape: ${response.statusText}`
      );
    }

    const result = await response.json();
  } catch (error) {
    console.error("Ошибка в addDropCellShape:", error);
  }
};

const addUpsells = async (id) => {
  try {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id, quantity: 1 }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ошибка при добавлении upsell: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Товар upsell добавлен:", result);
  } catch (error) {
    console.error("Ошибка в addUpsells:", error);
  }
};

// Объявление кастомного элемента product-form
if (!customElements.get('product-form')) {
 
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.initializeElements();
      this.setupEventListeners();
    }

    initializeElements() {
      
      this.getContactsForm = document.querySelector('#popupOverlayGetContacts');
      this.form = this.querySelector('form');
      this.form.querySelector('[name=id]').disabled = false;
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('button[type="button"]') || document.querySelector('button[type="button"]');
      if (this.cart && document.querySelector('cart-drawer')) {
        this.submitButton.setAttribute('aria-haspopup', 'dialog');
      }
      this.responseProduct = '';
      const showNotification = document.querySelector('.showNotification');
      showNotification.addEventListener('click', () => {
        this.cart.renderContents(this.responseProduct);
        this.getContactsForm.classList.remove('show');
        document.querySelector('html').classList.remove('overflow-hidden')
        setTimeout(() => { this.cart.querySelector('#cart-notification').classList.add('active'); }, 200);
        console.log(this.cart.querySelector('#cart-notification'))
      });
    }

    setupEventListeners() {
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
    }

    async onSubmitHandler(evt) {
      evt.preventDefault();
      const matPatternInputChecked = document.querySelector('[data-type="matPattern"] input:checked');

      if (this.submitButton.getAttribute("aria-disabled") === "true") return;

      if (this.handleErrorMessage() == false) {
        return;
      }

      this.submitButton.setAttribute("aria-disabled", true);
      this.submitButton.classList.add("loading");
      this.querySelector(".loading-overlay__spinner").classList.remove("hidden");

      const config = fetchConfig("javascript");
      config.headers["X-Requested-With"] = "XMLHttpRequest";
      delete config.headers["Content-Type"];

      const formData = new FormData(this.form);

      if (this.cart) {
        formData.append(
          "sections",
          this.cart.getSectionsToRender().map((section) => section.id)
        );
        formData.append("sections_url", window.location.pathname);
        this.cart.setActiveElement(document.activeElement);
      }
      config.body = formData;

      const productUpsell = document.querySelector(".product__dropdown_wr--heel .product__upsell");
      const upsellItems = productUpsell
        ? productUpsell.querySelectorAll(".product__upsell_item")
        : [];

      

      const checkProductUpsell = async () => {
        for (const item of upsellItems) {
          const input = item.querySelector("input[type='checkbox']");
          if (input && input.checked) {
            await addUpsells(input.value);
          }
        }
      };

      if (productUpsell) await checkProductUpsell();

      const extrasWr = document.querySelector(".product__dropdown_wr--extras");
      if (extrasWr) {
        const extrasChecked = extrasWr.querySelectorAll("input[name='product__extras']:checked");
        for (const input of extrasChecked) {
          if (input.value) await addUpsells(input.value);
        }
      }

      if (matPatternInputChecked) {
        if (matPatternInputChecked.getAttribute('data-value') == 'drop') {
          console.log('[product-form] add drop surcharge variant', DROP_CELL_SHAPE_VARIANT_ID);
          await addDropCellShape(DROP_CELL_SHAPE_VARIANT_ID);
        }
      }

      await fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this.handleErrorMessage(response.description);
            const soldOutMessage = this.submitButton.querySelector(
              ".sold-out-message"
            );
            if (soldOutMessage) {
              this.submitButton.setAttribute("aria-disabled", true);
              this.submitButton.querySelector("span").classList.add("hidden");
              soldOutMessage.classList.remove("hidden");
              this.error = true;
            }
            return;
          } else if (!this.cart) {
            setTimeout(() => {
              window.location.href = '/cart';
            }, 2000);
            return;
          }

          if (!this.error)
            publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form" });
          this.error = false;
          const quickAddModal = this.closest("quick-add-modal");
          if (quickAddModal) {
            document.body.addEventListener(
              "modalClosed",
              () => {
                setTimeout(() => {
                  this.cart.renderContents(response);
                });
              },
              { once: true }
            );
            quickAddModal.hide(true);
          } else {
            this.cart.renderContents(response); // open notification
            this.responseProduct = response;
            // if (this.getContactsForm) {
            //   this.getContactsForm.classList.add('show');
            //   document.querySelector('html').classList.add('overflow-hidden')
            // }
          }
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.submitButton.classList.remove("loading");
          if (this.cart && this.cart.classList.contains("is-empty")) {
            this.cart.classList.remove("is-empty");
          }
          if (!this.error) this.submitButton.removeAttribute("aria-disabled");
          this.querySelector(".loading-overlay__spinner").classList.add("hidden");
        });
      
      
    }

    handleErrorMessage() {
      let formValid = true;
      let firstInvalidElement = null;
    
      function validateRequiredGroups() {
        // Выбираем только обязательные поля, которые не находятся внутри опциональных шагов
        const requiredElements = Array.from(
          document.querySelectorAll('.product__info-container input[required], .product__info-container select[required]')
        ).filter(el => !el.closest('.product__dropdown_wr--hell'));
        
        const groups = new Map();
    
        requiredElements.forEach((element) => {
          const fieldset = element.closest('fieldset');
          if (fieldset) {
            if (!groups.has(fieldset)) {
              groups.set(fieldset, []);
            }
            groups.get(fieldset).push(element);
          }
        });
    
        groups.forEach((elements, fieldset) => {
          let groupValid = elements.some(element => {
            if (element.type === 'radio' || element.type === 'checkbox') {
              return element.checked;
            } else if (element.type === 'select-one') {
              return element.value;
            } else if (element.type === 'text') {
              return element.value.trim() !== '';
            }
            return false;
          });
    
          const errorMessage = fieldset.querySelector('.error-message');
          if (!groupValid) {
            if (errorMessage) {
              errorMessage.style.display = 'block';
            }
            formValid = false;
            if (!firstInvalidElement) {
              firstInvalidElement = fieldset;
            }
          } else {
            if (errorMessage) {
              errorMessage.style.display = 'none';
            }
          }
        });
      }
    
      validateRequiredGroups();
    
      // Проверяем обязательные шаги: пропускаем шаги, которые находятся внутри опциональных контейнеров
      const steps = Array.from(
        document.querySelectorAll('product-info .product__dropdown_inner')
      ).filter(step => !step.closest('.product__dropdown_wr--heel'));
    
      steps.forEach(step => {
        if (!step.classList.contains('super_done')) {
          // Если шаг не завершён, отмечаем форму как невалидную
          formValid = false;
          if (!firstInvalidElement) {
            firstInvalidElement = step.closest('.product__dropdown_wr');
          }
        }
      });
    
      if (!formValid) {
        if (firstInvalidElement) {
          console.log(firstInvalidElement)
          const offsetTop = firstInvalidElement.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
        // Убираем или комментируем вывод ошибки в консоль, чтобы не мешало
        console.log('Form is not valid');
        return false;
      } else {
        console.log('Form is valid');
        return true;
      }
    }
    
    
  });
}

// Логика для кнопки "Купить сейчас"
// const buyNowButton = document.getElementById('add-to-cart-and-checkout');
// const productUpsell = document.querySelector('.product__upsell');

// const validateCheckbox = () => {
//   const termsCheckbox = document.getElementById('newsletter-checkbox');
//   const messageField = document.querySelector('#message');
  
//       const messageText = document.querySelector(".message_text");

//   if (!termsCheckbox || !termsCheckbox.checked) {
//     messageField.innerText = messageText.textContent;
//     messageField.style.display = 'block';
//     return false;
//   } else {
//     messageField.innerText = '';
//     messageField.style.display = 'none';
//     return true;
//   }
// };

// const addToCart = async () => {
//   try {
//     const properties = {};

//     const rokProdukcji = document.querySelector('[name="properties[Year of production]"]');
//     if (rokProdukcji) properties['Year of production'] = rokProdukcji.value;


//     const cellShape = document.querySelector('[name="properties[Cell shape]"]:checked');
//     if (cellShape) properties['Cell shape'] = cellShape.value;

//     const materialColor = document.querySelector('[name="properties[Material color]"]:checked');
//     if (materialColor) properties['Material color'] = materialColor.value;

//     const trimColor = document.querySelector('[name="properties[Trim color]"]:checked');
//     if (trimColor) properties['Trim color'] = trimColor.value;

//     const brand = document.querySelector('[name="properties[Brand]"]');
//     if (brand) properties['Brand'] = brand.value;

//     const model = document.querySelector('[name="properties[Model]"]');
//     if (model) properties['Model'] = model.value;

//     const bodyType = document.querySelector('[name="properties[Body type]"]:checked');
//     if (bodyType) properties['Body type'] = bodyType.value;

//     const orderNotes = document.querySelector('#uwagi-do-zamowienia');
//     if (orderNotes) properties['Order notes'] = orderNotes.value;


//     const productId = document.querySelector('.product-form [name="id"]').value;

//     const response = await fetch('/cart/add.js', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         id: productId,
//         quantity: 1,
//         properties: properties
//       })
//     });

//     if (!response.ok) {
//       throw new Error('Ошибка при добавлении в корзину');
//     }

//     const result = await response.json();
//     console.log('Товар добавлен в корзину:', result);

//     // Перенаправление на страницу оформления заказа
//     window.location.href = '/checkout';
//   } catch (error) {
//     console.error('Ошибка при добавлении товара в корзину:', error);
//     alert('Error. Try again');
//   }
// };

// if (buyNowButton) {
//   buyNowButton.addEventListener('click', async (event) => {
//     event.preventDefault();

//     if (!validateCheckbox()) {
//       return;
//     }

//     const productFormElement = document.querySelector('product-form');
//     if (productFormElement && !productFormElement.handleErrorMessage()) {
//       return;
//     }

//     const upsellItems = productUpsell ? productUpsell.querySelectorAll('.product__upsell_item') : [];
//     for (const item of upsellItems) {
//       const input = item.querySelector('input[type="checkbox"]');
//       if (input && input.checked) {
//         const upsellId = input.value;
//         await addUpsells(upsellId);
//       }
//     }

//     await addToCart();
//   });
// }
