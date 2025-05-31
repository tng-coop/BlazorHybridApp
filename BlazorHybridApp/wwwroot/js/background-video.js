
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
        { api: '/api/waterfall-video-url', url: null },
        { api: '/api/goat-video-url', url: null }
    ];
    let index = 0; // currently playing playlist index
    let nextIndex = 1;
    let currentVideo = 0;
    let nextVideo = 1;

    const FADE_DURATION = 0.5; // seconds before the end when we start the fade

    let startTime = null;
    let playbacks = 0;
    let isSwitching = false;

    async function getCachedVideoUrl(idx, retries = 3) {
        const entry = playlist[idx];
        if (entry.url) return entry.url;
        for (let i = 0; i < retries; i++) {
            try {
                const url = await getVideoUrl(entry.api);
                if (url) {
                    entry.url = url;
                    return url;
                }
            } catch (e) {
                if (i === retries - 1) throw e;
            }
        }
        throw new Error('Empty video url');
    }

    async function preload(video, idx) {
        const src = await getCachedVideoUrl(idx);
        video.src = src;
        video.loop = false;
        video.preload = 'auto';
        video.load();
        return src;
    }

    let timeUpdateHandler = null;

    function setupTimeUpdate(video) {
        if (timeUpdateHandler) {
            video.removeEventListener('timeupdate', timeUpdateHandler);
        }
        timeUpdateHandler = async function () {
            if (isSwitching) return;
            if (video.duration - video.currentTime <= FADE_DURATION) {
                video.removeEventListener('timeupdate', timeUpdateHandler);
                await switchVideos();
            }
        };
        video.addEventListener('timeupdate', timeUpdateHandler);
    }

    async function playInitial() {
        const src = await preload(videos[currentVideo], index);
        await videos[currentVideo].play();
        videos[currentVideo].style.opacity = '1';
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${src} (${playbacks}) (0s)`;
        }
        nextIndex = (index + 1) % playlist.length;
        await preload(videos[nextVideo], nextIndex);
        setupTimeUpdate(videos[currentVideo]);
    }

    async function switchVideos() {
        if (isSwitching) return;
        isSwitching = true;

        const vCurrent = videos[currentVideo];
        const vNext = videos[nextVideo];

        if (timeUpdateHandler) {
            vCurrent.removeEventListener('timeupdate', timeUpdateHandler);
            timeUpdateHandler = null;
        }

        await vNext.play();
        vNext.style.opacity = '1';
        vCurrent.style.opacity = '0';
        vCurrent.pause();

        index = nextIndex;
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${vNext.src} (${playbacks}) (0s)`;
        }

        currentVideo = nextVideo;
        nextVideo = currentVideo ? 0 : 1;
        nextIndex = (index + 1) % playlist.length;
        await preload(videos[nextVideo], nextIndex);
        setupTimeUpdate(videos[currentVideo]);
        isSwitching = false;
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
