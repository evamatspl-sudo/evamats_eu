
// videos section
(function () {
    document.addEventListener('DOMContentLoaded', function() {
        const videoSection = document.querySelector('.videos');
        if(videoSection) {
            const videos = videoSection.querySelectorAll('video');
            let isVisible = false; // Флаг видимости слайдера
            const videoPlay = () => {
                if (!isVisible) return; // Если слайдер не виден, не воспроизводим видео
                videoSection.querySelectorAll('video').forEach(video => {
                    video.pause();
                });

                videos.forEach(video => {
                    if (video) {
                        video.currentTime = 0.2;
                        video.play();
                    }
                });
                
            };

            // === Intersection Observer для управления autoplay и воспроизведением видео ===
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    isVisible = entry.isIntersecting;

                    if (isVisible) {
                        videoPlay();
                    } else {
                        videos.forEach(video => {
                            video.pause();
                        });
                    }
                });
            }, { threshold: 0.5 });

            const videosContainer = document.querySelector('.videos__container');
            if (videosContainer) {
                observer.observe(videosContainer);
            }
        }
    })
})();
// videos section

// image section animation auto
(function () {
    const imageAuto = document.querySelector('.image-section__auto');
    if (!imageAuto) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                imageAuto.classList.add('active');
            }
        });
    }, { threshold: 0.5 });

    observer.observe(imageAuto);
})();
// image section animation auto