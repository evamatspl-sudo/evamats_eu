document.addEventListener('DOMContentLoaded', () => {
    const thumbs = new Swiper('.eva-product-thumbs', {
        spaceBetween: 12,
        slidesPerView: "auto",
        direction: 'vertical',
        watchSlidesProgress: true,
        breakpoints: {
            0: {
                direction: 'horizontal'
            },
            768: {
                direction: 'vertical'
            }
        }
    });

    new Swiper('.eva-product-main', {
        spaceBetween: 10,
        slidesPerView: 1,
        thumbs: {
            swiper: thumbs
        },
        pagination: {
            el: '.eva-product__pagination',
            clickable: true
        },

        navigation: {
            nextEl: '.eva-product__arrow--next',
            prevEl: '.eva-product__arrow--prev'
        }
    });
});