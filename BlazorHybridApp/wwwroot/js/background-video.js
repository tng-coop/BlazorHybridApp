(function () {
    const video = document.getElementById('waterfall-video-background');
    if (!video) return;

    const playlist = [
        { src: '/api/waterfall-video', poster: '/api/waterfall' },
        { src: '/api/goat-video', poster: '/api/goat' }
    ];
    let index = 0;

    function playNext() {
        index++;
        if (index < playlist.length) {
            const next = playlist[index];
            video.src = next.src;
            video.poster = next.poster;
            video.loop = true;
            video.play();
        }
    }

    video.addEventListener('ended', playNext);
})();
