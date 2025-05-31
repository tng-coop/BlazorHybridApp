
(async function () {
    const videos = [
        document.getElementById('background-video-1'),
        document.getElementById('background-video-2')
    ];
    const info = document.getElementById('video-info');
    if (!videos[0] || !videos[1]) return;

    videos.forEach(v => {
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.playsInline = true;
    });

    async function getVideoUrl(api) {
        const resp = await fetch(api);
        if (!resp.ok) throw new Error('Failed to fetch video url');
        const data = await resp.json();
        return data.url;
    }

    const playlist = [
        { api: '/api/waterfall-video-url' },
        { api: '/api/goat-video-url' }
    ];
    let index = 0; // currently playing playlist index
    let nextIndex = 1;
    let currentVideo = 0;
    let nextVideo = 1;

    let startTime = null;
    let playbacks = 0;

    async function preload(video, api) {
        const src = await getVideoUrl(api);
        if (!src) throw new Error('Empty video url');
        video.src = src;
        video.loop = false;
        video.preload = 'auto';
        video.load();
        return src;
    }

    async function playInitial() {
        const src = await preload(videos[currentVideo], playlist[index].api);
        await videos[currentVideo].play();
        videos[currentVideo].style.opacity = '1';
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${src} (${playbacks}) (0s)`;
        }
        nextIndex = (index + 1) % playlist.length;
        await preload(videos[nextVideo], playlist[nextIndex].api);
        videos[currentVideo].onended = handleEnd;
    }

    async function switchVideos() {
        const vCurrent = videos[currentVideo];
        const vNext = videos[nextVideo];

        await vNext.play();
        vNext.style.opacity = '1';
        vCurrent.style.opacity = '0';
        vCurrent.pause();
        vCurrent.onended = null;

        index = nextIndex;
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${vNext.src} (${playbacks}) (0s)`;
        }

        currentVideo = nextVideo;
        nextVideo = currentVideo ? 0 : 1;
        nextIndex = (index + 1) % playlist.length;
        await preload(videos[nextVideo], playlist[nextIndex].api);
        videos[currentVideo].onended = handleEnd;
    }

    async function handleEnd() {
        await switchVideos();
    }

    await playInitial();

    if (info) {
        setInterval(() => {
            if (startTime !== null) {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                info.textContent = `URL: ${videos[currentVideo].src} (${playbacks}) (${seconds}s)`;
            }
        }, 1000);
    }
})();
