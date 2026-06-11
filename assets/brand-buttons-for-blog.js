document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('.main-blog__brands-dropdown');
    const button = document.querySelector('.main-blog__dropdown-toggle');

    button.addEventListener('click', () => {
        dropdown.classList.toggle('active');
    });

    const input = document.querySelector('.main-blog__search-input');

    if (!input) return;

    const cards = document.querySelectorAll('.article-card-wrapper');

    const counts = document.querySelectorAll('.js-search-count');
    const labels = document.querySelectorAll('.js-search-label');
    const resetBtn = document.querySelector('.main-blog__search-reset');

    function updateResults(value = '') {

        let visibleCount = 0;

        cards.forEach(card => {

            const title = card.dataset.title || '';
            const parent = card.parentElement;

            if (title.includes(value)) {

                parent.classList.remove('is-hidden');
                visibleCount++;

            } else {

                parent.classList.add('is-hidden');

            }

        });

        // COUNT
        counts.forEach(count => {
            count.textContent = visibleCount;
        });

        // LABEL
        labels.forEach(label => {

            const singular = label.dataset.singular;
            const plural = label.dataset.plural;

            label.textContent =
                visibleCount === 1
                    ? singular
                    : plural;

        });

    }

    // SEARCH
    input.addEventListener('input', function () {
        updateResults(this.value.toLowerCase().trim());
    });

    // RESET
    resetBtn?.addEventListener('click', () => {

        input.value = '';

        updateResults('');

    });
});