function initContentGallerySlider() {
    const sliders = document.querySelectorAll('[data-content-gallery-slider]');

    sliders.forEach((slider) => {
        if (slider.swiper) {
            slider.swiper.destroy(true, true);
        }

        const section = slider.closest('.content-gallery-slider');

        new Swiper(slider, {
            slidesPerView: 1.62,
            spaceBetween: 4,

            navigation: {
                nextEl: section.querySelector(
                    '.content-gallery-slider__arrow--next'
                ),
                prevEl: section.querySelector(
                    '.content-gallery-slider__arrow--prev'
                ),
            },

            breakpoints: {
                750: {
                    slidesPerView: 2,
                    spaceBetween: 4,
                },
                990: {
                    slidesPerView: 4,
                    spaceBetween: 4,
                },
            },
        });
    });
}

document.addEventListener('DOMContentLoaded', initContentGallerySlider);

document.addEventListener(
    'shopify:section:load',
    initContentGallerySlider
);

document.addEventListener(
    'shopify:block:select',
    initContentGallerySlider
);