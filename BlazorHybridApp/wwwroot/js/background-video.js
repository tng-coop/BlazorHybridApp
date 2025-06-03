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

  async function getVideoInfo(api) {
    const resp = await fetch(api);
    if (!resp.ok) throw new Error('Failed to fetch video info');
    return await resp.json();
  }

  const playlist = [
    { api: '/api/waterfall-video-info', url: null, poster: null },
    { api: '/api/goat-video-url',       url: null }
  ];
  let index = 0;        // which playlist entry is “current”
  let nextIndex = 1;    // which playlist entry is “next”
  let currentVideo = 0; // which <video> element is playing (0 or 1)
  let nextVideo    = 1; // which <video> element is preloaded (0 or 1)

  const FADE_DURATION = 0.5; // seconds before end to start fading

  let startTime = null;
  let playbacks = 0;
  let isSwitching = false;

  // Cache name for storing full MP4s:
  const CACHE_NAME = 'pexels-videos-cache-v1';

  // Try up to 3 times to get the URL from your API, then cache it in playlist[idx].url
  async function getCachedVideoUrl(idx, retries = 3) {
    const entry = playlist[idx];
    if (entry.url) return entry.url;
    for (let i = 0; i < retries; i++) {
      try {
        const info = await getVideoInfo(entry.api);
        if (info && info.url) {
          entry.url = info.url;
          if (info.poster) entry.poster = info.poster;
          return entry.url;
        }
      } catch (e) {
        if (i === retries - 1) throw e;
      }
    }
    throw new Error('Empty video url');
  }

  /**
   * Preload a video element by:
   * 1) Checking Cache Storage for a cached Response under `src`.
   * 2) If not found, do a fetch(src) (single full GET), put response.clone() into cache.
   * 3) Convert the Response into a Blob, then a Blob URL, assign that to videoEl.src.
   * 4) Store the Blob URL on the element so we can revoke it later.
   */
  async function preload(videoEl, idx) {
    // 1) Get the remote URL from your API (cached in playlist[idx].url)
    const src = await getCachedVideoUrl(idx);

    // 2) Open (or create) the named cache
    const cache = await caches.open(CACHE_NAME);

    // 3) See if we already have a Response for this exact URL
    let response = await cache.match(src);
    if (!response) {
      // Not cached yet → fetch it as a single full-file GET (no Range header)
      response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Network error fetching ${src}: status ${response.status}`);
      }
      try {
        // Cache a clone of the response. If this fails (quota, etc.), we'll just proceed without caching.
        await cache.put(src, response.clone());
      } catch (quotaErr) {
        console.warn('Could not cache video (quota?):', quotaErr);
        // continue without caching
      }
    }

    // 4) Convert the response into a Blob, then a Blob URL
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // 5) If videoEl already had a previous blob URL, revoke it to free memory
    if (videoEl._lastBlobUrl) {
      URL.revokeObjectURL(videoEl._lastBlobUrl);
    }
    videoEl._lastBlobUrl = blobUrl;

    // 6) Assign the blob URL as the <video> source
    videoEl.src = blobUrl;
    videoEl.loop = false;
    videoEl.preload = 'auto';
    videoEl.load();

    return blobUrl;
  }

  async function preloadPoster(videoEl, idx) {
    const entry = playlist[idx];
    if (!entry.poster) {
      const info = await getVideoInfo(entry.api);
      if (info.poster) entry.poster = info.poster;
    }
    if (!entry.poster) return;

    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(entry.poster);
    if (!response) {
      response = await fetch(entry.poster);
      if (response.ok) {
        try {
          await cache.put(entry.poster, response.clone());
        } catch (err) {
          console.warn('Could not cache poster:', err);
        }
      } else {
        console.warn('Failed to fetch poster:', response.status);
        return;
      }
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (videoEl._lastPosterBlobUrl) {
      URL.revokeObjectURL(videoEl._lastPosterBlobUrl);
    }
    videoEl._lastPosterBlobUrl = blobUrl;
    videoEl.poster = blobUrl;
  }

  let timeUpdateHandler = null;
  function setupTimeUpdate(videoEl) {
    // Remove any old listener first
    if (timeUpdateHandler) {
      videoEl.removeEventListener('timeupdate', timeUpdateHandler);
    }
    timeUpdateHandler = async function () {
      if (isSwitching) return;
      if (videoEl.duration - videoEl.currentTime <= FADE_DURATION) {
        videoEl.removeEventListener('timeupdate', timeUpdateHandler);
        await switchVideos();
      }
    };
    videoEl.addEventListener('timeupdate', timeUpdateHandler);
  }

  // Start playing the very first video in the playlist
  async function playInitial() {
    await preloadPoster(videos[currentVideo], index);
    const blobUrl = await preload(videos[currentVideo], index);
    try {
      await videos[currentVideo].play();
    } catch (err) {
      console.warn('playInitial(): play() failed, skipping to next clip:', err);
      return switchVideos();
    }
    videos[currentVideo].style.opacity = '1';
    startTime = Date.now();
    playbacks++;
    if (info) {
      info.textContent = `URL: ${blobUrl} (${playbacks}) (0s)`;
    }
    nextIndex = (index + 1) % playlist.length;
    await preload(videos[nextVideo], nextIndex);
    setupTimeUpdate(videos[currentVideo]);
  }

  // Fade out the current video and fade in the next one
  async function switchVideos() {
    if (isSwitching) return;
    isSwitching = true;

    const vCurr = videos[currentVideo];
    const vNext = videos[nextVideo];

    // Remove the old timeupdate listener
    if (timeUpdateHandler) {
      vCurr.removeEventListener('timeupdate', timeUpdateHandler);
      timeUpdateHandler = null;
    }

    // Try to play the next video; if that fails, skip again
    try {
      await vNext.play();
    } catch (err) {
      console.warn('switchVideos(): vNext.play() failed, skipping one more:', err);
      // Advance our playlist indices to skip the problematic clip
      index = nextIndex;                        // “consume” the failed next
      nextIndex = (index + 1) % playlist.length;
      currentVideo = nextVideo;                 // the “current” element is still vNext
      nextVideo = currentVideo ? 0 : 1;         // the other DOM slot is the new “next”
      await preload(videos[nextVideo], nextIndex);
      // Attempt to play that new “next” one directly:
      try {
        await videos[nextVideo].play();
        videos[nextVideo].style.opacity = '1';
        vNext.style.opacity = '0';
        vNext.pause();
      } catch (err2) {
        console.error('switchVideos(): second play() failed, giving up:', err2);
        isSwitching = false;
        return;
      }

      // Update metadata/display
      startTime = Date.now();
      playbacks++;
      if (info) {
        info.textContent = `URL: ${videos[nextVideo].src} (${playbacks}) (0s)`;
      }

      // Recompute “current” & “next” slots
      currentVideo = nextVideo;
      nextVideo = currentVideo ? 0 : 1;
      nextIndex = (index + 1) % playlist.length;
      await preload(videos[nextVideo], nextIndex);
      setupTimeUpdate(videos[currentVideo]);
      isSwitching = false;
      return;
    }

    // If vNext.play() succeeded, do the fade
    vNext.style.opacity = '1';
    vCurr.style.opacity = '0';
    vCurr.pause();

    // Advance our playlist pointers
    index = nextIndex;
    startTime = Date.now();
    playbacks++;
    if (info) {
      info.textContent = `URL: ${vNext.src} (${playbacks}) (0s)`;
    }

    currentVideo = nextVideo;
    nextVideo = currentVideo ? 0 : 1;
    nextIndex = (index + 1) % playlist.length;

    // Preload the following clip
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
