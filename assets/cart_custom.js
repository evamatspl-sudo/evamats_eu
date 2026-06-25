(function () {
    const TERMS_STORAGE_KEY = 'evamatsCartTermsAccepted';

    function getTermsCheckbox() {
        return document.querySelector('.evamats-cart-sidebar [data-cart-terms-checkbox]');
    }

    function saveTermsAccepted(checked) {
        if (checked) {
            sessionStorage.setItem(TERMS_STORAGE_KEY, '1');
        } else {
            sessionStorage.removeItem(TERMS_STORAGE_KEY);
        }
    }

    window.restoreEvamatsCartTermsCheckbox = function () {
        const termsCheckbox = getTermsCheckbox();
        if (termsCheckbox && sessionStorage.getItem(TERMS_STORAGE_KEY) === '1') {
            termsCheckbox.checked = true;
        }
        return termsCheckbox;
    };

    let stickyObserver;

    window.initEvamatsCartSidebarControls = function () {
        const checkoutButton = document.querySelector('.evamats-cart-sidebar .cart__checkout-button');
        const stickycheckoutButton = document.querySelector('.sticky_container');
        const termsCheckbox = window.restoreEvamatsCartTermsCheckbox();
        const messageField = document.querySelector('.evamats-cart-sidebar #message');
        const messageText = document.querySelector('.evamats-cart-sidebar .message_text');
        const dynamicCheckout = document.querySelector('.evamats-cart-sidebar__dynamic-checkout');

        function showTermsMessage() {
            if (messageField && messageText) {
                messageField.textContent = messageText.textContent;
            }
        }

        function updateTermsGate() {
            const checked = !!(termsCheckbox && termsCheckbox.checked);
            if (checkoutButton) checkoutButton.disabled = !checked;
            if (dynamicCheckout) {
                dynamicCheckout.classList.toggle('is-terms-blocked', !checked);
            }
            if (checked && messageField) messageField.textContent = '';
        }

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

        if (termsCheckbox && !termsCheckbox.dataset.bound) {
            termsCheckbox.dataset.bound = 'true';
            termsCheckbox.addEventListener('change', function () {
                saveTermsAccepted(termsCheckbox.checked);
                updateTermsGate();
            });
        }

        if (checkoutButton && !checkoutButton.dataset.bound) {
            checkoutButton.dataset.bound = 'true';
            checkoutButton.addEventListener('click', function (event) {
                if (termsCheckbox && !termsCheckbox.checked) {
                    event.preventDefault();
                    showTermsMessage();
                }
            });
        }

        if (dynamicCheckout && !dynamicCheckout.dataset.termsBound) {
            dynamicCheckout.dataset.termsBound = 'true';
            dynamicCheckout.addEventListener('click', function (event) {
                if (termsCheckbox && !termsCheckbox.checked) {
                    event.preventDefault();
                    event.stopPropagation();
                    showTermsMessage();
                }
            }, true);
        }

        updateTermsGate();
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
