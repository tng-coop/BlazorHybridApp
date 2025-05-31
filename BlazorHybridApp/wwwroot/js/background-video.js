window.startBackgroundVideos = function () {
    const v1 = document.getElementById('background-video-1');
    const v2 = document.getElementById('background-video-2');
    if (!v1 || !v2) {
        return;
    }

    const videos = [v1, v2];
    videos.forEach(v => {
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.playsInline = true;
        v.style.opacity = '0';
    });

    let current = 0;

    function switchVideos() {
        const next = current ? 0 : 1;
        videos[next].style.opacity = '1';
        videos[next].play();
        videos[current].style.opacity = '0';
        videos[current].pause();
        videos[next].addEventListener('timeupdate', checkFade);
        videos[current].removeEventListener('timeupdate', checkFade);
        current = next;
    }

    function checkFade() {
        const v = videos[current];
        if (v.duration && v.duration - v.currentTime <= 0.5) {
            switchVideos();
        }
    }

    videos[current].style.opacity = '1';
    videos[current].addEventListener('timeupdate', checkFade);
    videos[current].play();
};
