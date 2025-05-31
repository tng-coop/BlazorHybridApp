
(async function () {
    const video = document.getElementById('background-video');
    const info = document.getElementById('video-info');
    if (!video) return;

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;

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

    let timeUpdateHandler = null;

    function setupTimeUpdate() {
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
        const src = await getCachedVideoUrl(index);
        video.src = src;
        video.loop = false;
        video.preload = 'auto';
        await video.play();
        video.style.opacity = '1';
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${src} (${playbacks}) (0s)`;
        }
        nextIndex = (index + 1) % playlist.length;
        await getCachedVideoUrl(nextIndex);
        setupTimeUpdate();
    }

    async function switchVideos() {
        if (isSwitching) return;
        isSwitching = true;

        if (timeUpdateHandler) {
            video.removeEventListener('timeupdate', timeUpdateHandler);
            timeUpdateHandler = null;
        }

        const nextSrc = await getCachedVideoUrl(nextIndex);
        video.style.opacity = '0';
        video.pause();
        video.src = nextSrc;
        video.loop = false;
        video.preload = 'auto';
        video.load();
        await video.play();
        video.style.opacity = '1';

        index = nextIndex;
        startTime = Date.now();
        playbacks++;
        if (info) {
            info.textContent = `URL: ${nextSrc} (${playbacks}) (0s)`;
        }
        nextIndex = (index + 1) % playlist.length;
        await getCachedVideoUrl(nextIndex);
        setupTimeUpdate();
        isSwitching = false;
    }

    await playInitial();

    if (info) {
        setInterval(() => {
            if (startTime !== null) {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                info.textContent = `URL: ${video.src} (${playbacks}) (${seconds}s)`;
            }
        }, 1000);
    }
})();
