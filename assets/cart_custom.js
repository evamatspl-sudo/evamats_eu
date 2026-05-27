(function () {
    const checkoutButton = document.querySelector('.cart__checkout-button');
    const stickycheckoutButton = document.querySelector('.sticky_container');
  

        // Создаем наблюдатель
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
            if (!stickycheckoutButton) return;
            if (!entry.isIntersecting) {
                // Если элемент не виден, добавляем класс active
                stickycheckoutButton.classList.add('active');
            } else {
                // Если элемент виден, убираем класс active
                stickycheckoutButton.classList.remove('active');
            }
            });
        });
        
        
        // Начинаем наблюдение за основным элементом
        if (checkoutButton) {
            observer.observe(checkoutButton);
        }
        const termsCheckbox = document.getElementById("newsletter-checkbox");
        const messageField = document.querySelector("#message");
        const messageText = document.querySelector(".message_text");

        if (termsCheckbox && checkoutButton) {
            termsCheckbox.addEventListener('change', function() {
                checkoutButton.disabled = !this.checked;
                if (messageField) messageField.innerText = '';
            });
        }

        if (checkoutButton) {
            checkoutButton.addEventListener('click', function (event) {
                if (termsCheckbox && !termsCheckbox.checked) {
                    event.preventDefault();
                    if (messageField && messageText) {
                        messageField.innerText = messageText.textContent;
                    }
                }
            });
        }
  
  })();

(function () {
    const stickycheckoutButton = document.querySelector('.sticky_add_to_cart');

if (!stickycheckoutButton) return;
stickycheckoutButton.addEventListener('click', function () {
    const target = document.querySelector('.cart__footer .cart__blocks_inner');
    if (target) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 300; // -300 пикселей вверх
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    }
});

})();