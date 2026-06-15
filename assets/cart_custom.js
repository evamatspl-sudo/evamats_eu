(function () {
    let stickyObserver;

    window.initEvamatsCartSidebarControls = function () {
        const checkoutButton = document.querySelector('.evamats-cart-sidebar .cart__checkout-button');
        const stickycheckoutButton = document.querySelector('.sticky_container');
        const termsCheckbox = document.getElementById('newsletter-checkbox');
        const messageField = document.querySelector('#message');
        const messageText = document.querySelector('.message_text');

        if (stickyObserver) {
            stickyObserver.disconnect();
            stickyObserver = null;
        }

        if (checkoutButton && stickycheckoutButton) {
            stickyObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        stickycheckoutButton.classList.add('active');
                    } else {
                        stickycheckoutButton.classList.remove('active');
                    }
                });
            });
            stickyObserver.observe(checkoutButton);
        }

        if (termsCheckbox && checkoutButton && !termsCheckbox.dataset.bound) {
            termsCheckbox.dataset.bound = 'true';
            termsCheckbox.addEventListener('change', function () {
                checkoutButton.disabled = !this.checked;
                if (messageField) messageField.innerText = '';
            });
        }

        if (checkoutButton && !checkoutButton.dataset.bound) {
            checkoutButton.dataset.bound = 'true';
            checkoutButton.addEventListener('click', function (event) {
                if (termsCheckbox && !termsCheckbox.checked) {
                    event.preventDefault();
                    if (messageField && messageText) {
                        messageField.innerText = messageText.textContent;
                    }
                }
            });
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        window.initEvamatsCartSidebarControls();
    });
})();

(function () {
    const stickycheckoutButton = document.querySelector('.sticky_add_to_cart');

if (!stickycheckoutButton) return;
stickycheckoutButton.addEventListener('click', function () {
    const target = document.querySelector('.evamats-cart-sidebar__actions') || document.querySelector('.cart__footer .cart__blocks_inner');
    if (target) {
        const rect = target.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 120;
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    }
});

})();