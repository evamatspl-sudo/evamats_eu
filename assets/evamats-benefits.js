document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.evamats-benefits');

    sections.forEach((section) => {
        const items = section.querySelectorAll('.evamats-benefits__item');

        items.forEach((item) => {
            const trigger = item.querySelector('.evamats-benefits__trigger');

            trigger.addEventListener('click', () => {
                const isActive = item.classList.contains('is-active');

                items.forEach((el) => {
                    el.classList.remove('is-active');

                    const btn = el.querySelector('.evamats-benefits__trigger');

                    if (btn) {
                        btn.setAttribute('aria-expanded', 'false');
                    }
                });

                if (!isActive) {
                    item.classList.add('is-active');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
        });
    });
});