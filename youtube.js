/* ==========================================================================
   youtube.js — DHL: loads the newest videos from your channel with the
   YouTube Data API v3 (read-only, public data). Falls back to the
   videos in content/videos.json when no key is set or the API fails.
   Settings: YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID in js/content.js.
   ========================================================================== */
const YouTubeService = (() => {
  const API = "https://www.googleapis.com/youtube/v3";
  const CACHE_KEY = "dhl_youtube_cache_v1";
  let pending = null;

  const isConfigured = () => {
    const { apiKey, channelId } = CONFIG.youtube;
    return Boolean(apiKey && channelId && apiKey.length > 20 && channelId.length > 10);
  };

  function categorize(text) {
    const t = (text || "").toLowerCase();
    for (const cat of ["korea", "testimony", "leadership", "study", "message"]) {
      if (VIDEO_CATEGORY_KEYWORDS[cat].some(word => t.includes(word))) return cat;
    }
    return "message";
  }

  function readCache() {
    const minutes = CONFIG.youtube.cacheMinutes;
    if (!minutes) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (saved && saved.channelId === CONFIG.youtube.channelId &&
          Date.now() - saved.time < minutes * 60000) return saved.videos;
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  function writeCache(videos) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        time: Date.now(), channelId: CONFIG.youtube.channelId, videos
      }));
    } catch (e) { /* storage unavailable */ }
  }

  async function getJSON(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `YouTube API error ${res.status}`);
    return data;
  }

  /* The uploads playlist of channel "UCabc…" is "UUabc…". Reading it with
     playlistItems costs 1 quota unit, versus 100 for a search request. */
  async function uploadsPlaylistId() {
    const { apiKey, channelId } = CONFIG.youtube;
    if (channelId.startsWith("UC")) return "UU" + channelId.slice(2);
    const data = await getJSON(`${API}/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`);
    const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!id) throw new Error("Channel not found. Check CONFIG.youtube.channelId.");
    return id;
  }

  async function fetchFromApi() {
    const { apiKey, maxResults } = CONFIG.youtube;
    const playlistId = await uploadsPlaylistId();
    const data = await getJSON(
      `${API}/playlistItems?part=snippet,contentDetails&maxResults=${Math.min(50, maxResults || 12)}` +
      `&playlistId=${playlistId}&key=${apiKey}`
    );
    return (data.items || [])
      .filter(item => item.contentDetails?.videoId &&
        !["Private video", "Deleted video"].includes(item.snippet?.title))
      .map(item => {
        const s = item.snippet;
        const th = s.thumbnails || {};
        return {
          videoId: item.contentDetails.videoId,
          title: s.title,
          description: (s.description || "").split("\n")[0].slice(0, 220),
          date: (item.contentDetails.videoPublishedAt || s.publishedAt || "").slice(0, 10),
          thumbnail: (th.maxres || th.high || th.medium || th.default || {}).url || "assets/images/thumb-youtube.svg",
          category: categorize(`${s.title} ${s.description}`)
        };
      });
  }

  const byNewest = (a, b) => (b.date || "").localeCompare(a.date || "");

  /** Returns { videos, source: "api" | "cache" | "fallback", error? } */
  function getLatestVideos() {
    if (pending) return pending;
    pending = (async () => {
      if (!isConfigured()) return { videos: [...fallbackVideos].sort(byNewest), source: "fallback" };
      const cached = readCache();
      if (cached) return { videos: cached, source: "cache" };
      try {
        const videos = (await fetchFromApi()).sort(byNewest);
        writeCache(videos);
        return { videos, source: "api" };
      } catch (error) {
        console.warn("[YouTube] Using fallback videos:", error.message);
        return { videos: [...fallbackVideos].sort(byNewest), source: "fallback", error: error.message };
      }
    })();
    return pending;
  }

  return { getLatestVideos, isConfigured };
})();
