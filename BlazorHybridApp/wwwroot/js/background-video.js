
(async function () {
    const video = document.getElementById('waterfall-video-background');
    if (!video) return;

    // Enable inline playback on iOS Safari and attempt to start the clip
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
    // Safari may ignore the autoplay attribute until play() is called
    video.play().catch(() => {});

    async function getVideoUrl(api) {
        const resp = await fetch(api);
        if (!resp.ok) throw new Error('Failed to fetch video url');
        const data = await resp.json();
        return data.url;
    }

    const playlist = [
        { api: '/api/waterfall-video-url', poster: '/api/waterfall' },
        { api: '/api/goat-video-url', poster: '/api/goat' }
    ];
    let index = 0;

    async function playCurrent() {
        const current = playlist[index];
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const src = await getVideoUrl(current.api);
                if (!src) throw new Error('Empty video url');

                video.src = src;
                video.poster = current.poster;
                video.loop = true;
                await video.play();
                return;
            } catch (e) {
                console.log('Video playback error', e);
                if (attempt < maxRetries - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
    }

    await playCurrent();

    video.addEventListener('ended', async () => {
        index++;
        if (index < playlist.length) {
            await playCurrent();
        }
    });
})();
