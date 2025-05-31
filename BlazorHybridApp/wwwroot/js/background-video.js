
(async function () {
    const video = document.getElementById('waterfall-video-background');
    const info = document.getElementById('video-info');
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

    let startTime = null;
    let playbacks = 0;

    async function playCurrent() {
        const current = playlist[index];
        const maxRetries = 9;
        console.log('Playing video from API:', current.api);
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const src = await getVideoUrl(current.api);
                if (!src) throw new Error('Empty video url');

                video.src = src;
                // video.poster = current.poster;
                video.loop = false; // handle looping manually to track playbacks
                await video.play();
                startTime = Date.now();
                playbacks++;
                if (info) {
                    info.textContent = `URL: ${video.src} (${playbacks}) (0s)`;
                }
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

    if (info) {
        setInterval(() => {
            if (startTime !== null) {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                info.textContent = `URL: ${video.src} (${playbacks}) (${seconds}s)`;
            }
        }, 1000);
    }

    video.addEventListener('ended', async () => {
        // Advance the playlist index and wrap back to the first item when we
        // reach the end so the videos cycle correctly.
        index = (index + 1) % playlist.length;
        await playCurrent();
    });
})();
