(async function () {
  const videos = [
    document.getElementById('background-video-1'),
    document.getElementById('background-video-2'),
  ];
  const info = document.getElementById('video-info');
  if (!videos[0] || !videos[1]) {
    console.error('Missing one or both <video> elements!');
    return;
  }

  // Only enforce inline‐play attributes and opacity transition.
  videos.forEach((v, i) => {
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.playsInline = true;
    v.loop = false;
    v.preload = 'auto';
    v.style.transition = 'opacity 0.5s ease';
    v.style.opacity = '0';
    console.log(`[Init] Video element #${i} prepared (playsinline + opacity=0).`);
  });

  async function getVideoInfo(api) {
    console.log(`[getVideoInfo] Fetching JSON from ${api}…`);
    const resp = await fetch(api);
    if (!resp.ok) {
      console.error(`[getVideoInfo] Failed to fetch ${api}: ${resp.status}`);
      throw new Error('Failed to fetch video info');
    }
    const json = await resp.json();
    console.log(`[getVideoInfo] Got JSON:`, json);
    return json;
  }

  const playlist = [
    { api: '/api/waterfall-video-info', url: null },
    { api: '/api/goat-video-url',       url: null },
  ];

  let currentVideo = 0;    // index of the <video> that’s playing (0 or 1)
  let nextVideo    = 1;    // the other index
  let playbacks    = 0;
  let startTime    = null;
  let isSwitching  = false;
  const FADE_DURATION = 0.5; // seconds before end to trigger fade
  const CACHE_NAME    = 'pexels-videos-cache-v1';

  async function getCachedVideoUrl(idx, attempts = 3) {
    const entry = playlist[idx];
    if (entry.url) {
      console.log(`[getCachedVideoUrl] Index ${idx} already has URL: ${entry.url}`);
      return entry.url;
    }

    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`[getCachedVideoUrl] Fetching URL for playlist[${idx}] (attempt ${i+1})…`);
        const info = await getVideoInfo(entry.api);
        if (info && info.url) {
          entry.url = info.url;
          console.log(`[getCachedVideoUrl] playlist[${idx}].url = ${entry.url}`);
          return entry.url;
        } else {
          console.warn(`[getCachedVideoUrl] No "url" field in JSON for attempt ${i+1}`);
        }
      } catch (e) {
        console.warn(`[getCachedVideoUrl] Error on attempt ${i+1} for idx ${idx}:`, e);
        if (i === attempts - 1) throw e;
      }
    }
    throw new Error('Empty video url');
  }

  /**
   * Preload a <video> element exactly once:
   * 1) Lookup Cache Storage under `src`. If not found, fetch it, then cache.
   * 2) Turn the response into a Blob, createObjectURL, assign as videoEl.src, then call load().
   * 3) Keep track of the last Blob URL so we can revoke it if the element is ever reused.
   */
  async function preload(videoEl, idx) {
    console.log(`[preload] Starting for videoEl #${idx}…`);
    const src = await getCachedVideoUrl(idx);
    console.log(`[preload] Resolved MP4 URL for idx ${idx}: ${src}`);

    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(src);

    if (!response) {
      console.log(`[preload] Not in cache. Fetching full file from ${src}…`);
      response = await fetch(src);
      if (!response.ok) {
        console.error(`[preload] Network error fetching ${src}: status ${response.status}`);
        throw new Error(`Network error fetching ${src}: status ${response.status}`);
      }
      try {
        await cache.put(src, response.clone());
        console.log(`[preload] Cached response for ${src}.`);
      } catch (quotaErr) {
        console.warn('[preload] Could not cache video (quota?):', quotaErr);
      }
    } else {
      console.log(`[preload] Found cached response for ${src}.`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    console.log(`[preload] Created blobUrl for idx ${idx}: ${blobUrl}`);

    if (videoEl._lastBlobUrl) {
      console.log(`[preload] Revoking old blob URL for videoEl #${idx}: ${videoEl._lastBlobUrl}`);
      URL.revokeObjectURL(videoEl._lastBlobUrl);
    }
    videoEl._lastBlobUrl = blobUrl;

    videoEl.src = blobUrl;
    console.log(`[preload] Assigned src to <video> #${idx}, now calling .load()…`);
    videoEl.load(); 
    console.log(`[preload] .load() called on <video> #${idx}.`);

    // Once metadata is ready, duration should be available. We'll log on "loadedmetadata".
    videoEl.addEventListener('loadedmetadata', function onMeta() {
      console.log(`[${idx}] loadedmetadata: duration = ${videoEl.duration.toFixed(2)}s`);
      videoEl.removeEventListener('loadedmetadata', onMeta);
    });

    return blobUrl;
  }

  let timeUpdateHandler = null;
  function setupTimeUpdate(videoEl) {
    if (timeUpdateHandler) {
      videoEl.removeEventListener('timeupdate', timeUpdateHandler);
    }

    timeUpdateHandler = async function () {
      // If we’re already in the middle of switching, skip
      if (isSwitching) return;

      // Log every timeupdate event (but only until the fade threshold):
      const rem = videoEl.duration - videoEl.currentTime;
      console.log(
        `[timeupdate] <video#${currentVideo}> currentTime=${videoEl.currentTime.toFixed(2)}, ` +
        `duration=${videoEl.duration.toFixed(2)}, remaining=${rem.toFixed(2)}`
      );

      if (rem <= FADE_DURATION) {
        console.log(`[timeupdate] Remaining <= FADE_DURATION (${FADE_DURATION}s). Kicking off switchVideos().`);
        videoEl.removeEventListener('timeupdate', timeUpdateHandler);
        await switchVideos();
      }
    };

    videoEl.addEventListener('timeupdate', timeUpdateHandler);
    console.log(`[setupTimeUpdate] Attached timeupdate handler to <video#${currentVideo}>.`);
  }

  // Run once at startup: preload both <video> tags, then play the first.
  async function initialize() {
    console.log('[initialize] Preloading both videos in parallel…');
    await Promise.all([
      preload(videos[0], 0),
      preload(videos[1], 1),
    ]);

    console.log('[initialize] Both videos preloaded. Now fading in & playing <video#0>.');
    videos[currentVideo].style.opacity = '1';
    try {
      await videos[currentVideo].play();
      console.log('[initialize] .play() succeeded on <video#0>.');
    } catch (err) {
      console.warn('[initialize] .play() failed on <video#0>, skipping to switch():', err);
      return switchVideos();
    }

    startTime = Date.now();
    playbacks++;
    if (info) {
      info.textContent = `URL: ${videos[currentVideo].src} (${playbacks}) (0s)`;
    }

    setupTimeUpdate(videos[currentVideo]);
  }

  async function switchVideos() {
    if (isSwitching) {
      console.log('[switchVideos] Already switching; returning early.');
      return;
    }
    isSwitching = true;
    console.log(`[switchVideos] Starting switch. currentVideo=${currentVideo}, nextVideo=${nextVideo}`);

    const vCurr = videos[currentVideo];
    const vNext = videos[nextVideo];

    // Remove timeupdate listener from the current video
    if (timeUpdateHandler) {
      vCurr.removeEventListener('timeupdate', timeUpdateHandler);
      timeUpdateHandler = null;
      console.log('[switchVideos] Removed timeupdate handler from current video.');
    }

    // Reset next video’s playback position to 0
    vNext.currentTime = 0;
    console.log(`[switchVideos] Reset <video#${nextVideo}> currentTime to 0.`);

    // Try to play the next video
    try {
      await vNext.play();
      console.log(`[switchVideos] .play() succeeded on <video#${nextVideo}>.`);
    } catch (err) {
      console.warn(`[switchVideos] .play() failed on <video#${nextVideo}>:`, err);
      isSwitching = false;
      return;
    }

    // Fade next in and fade current out
    vNext.style.opacity = '1';
    vCurr.style.opacity = '0';
    vCurr.pause();
    console.log(
      `[switchVideos] Fading: <video#${nextVideo}> opacity=1; <video#${currentVideo}> opacity=0; paused #${currentVideo}.`
    );

    // Flip indices
    currentVideo = nextVideo;
    nextVideo = currentVideo ? 0 : 1;
    console.log(`[switchVideos] New currentVideo=${currentVideo}, nextVideo=${nextVideo}`);

    // Update info panel & timestamps
    startTime = Date.now();
    playbacks++;
    if (info) {
      info.textContent = `URL: ${videos[currentVideo].src} (${playbacks}) (0s)`;
    }

    // Re‐attach timeupdate to the now-current video
    setupTimeUpdate(videos[currentVideo]);
    console.log('[switchVideos] Reattached timeupdate to new current video.');
    isSwitching = false;
  }

  console.log('[Main] Calling initialize()');
  await initialize();

  if (info) {
    setInterval(() => {
      if (startTime !== null) {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        info.textContent = `URL: ${videos[currentVideo].src} (${playbacks}) (${seconds}s)`;
      }
    }, 1000);
  }
})();
