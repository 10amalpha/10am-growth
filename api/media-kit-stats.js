// /api/media-kit-stats.js — Vercel Serverless Function
// Single source of truth for the media kit (media.10am.pro / repo anuncia10am).
// Returns, in one call:
//   snapshot  → latest growth_snapshots row (followers per channel, filled monthly by Hernán)
//   live      → YouTube subscribers/views + Instagram followers (live APIs)
//   episodes  → long-form episode count (uploads >= MIN_EPISODE_MINUTES, Shorts excluded) + latest episode
// Consumed weekly by the Claude scheduled task that refreshes anuncia10am/stats.js.

const YT_API_KEY = process.env.YT_API_KEY || "AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw";
const YT_CHANNEL_ID = "UC1yKEFqN6Tzz9DTK7fwS3LQ";
const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";
const MIN_EPISODE_MINUTES = 20;

function isoDurationToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

async function getSnapshot() {
  const url = `${SUPABASE_URL}/rest/v1/growth_snapshots?select=month,substack,youtube,tiktok,instagram,x_twitter,linkedin,spotify,apple_pods,updated_at&order=month.desc&limit=1`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] || null;
}

async function getYouTube() {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`);
  if (!r.ok) return null;
  const d = await r.json();
  const it = d.items?.[0];
  if (!it) return null;
  return {
    subscribers: parseInt(it.statistics.subscriberCount || "0"),
    totalViews: parseInt(it.statistics.viewCount || "0"),
    videoCount: parseInt(it.statistics.videoCount || "0"),
    uploadsPlaylist: it.contentDetails?.relatedPlaylists?.uploads || null,
  };
}

async function getInstagram() {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) return null;
  const pt = await fetch(`https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${token}`);
  if (!pt.ok) return null;
  const { access_token: pageToken } = await pt.json();
  if (!pageToken) return null;
  const ig = await fetch(`https://graph.facebook.com/v22.0/${IG_USER_ID}?fields=followers_count,media_count&access_token=${pageToken}`);
  if (!ig.ok) return null;
  const d = await ig.json();
  return { followers: d.followers_count || 0, mediaCount: d.media_count || 0 };
}

async function getEpisodes(uploadsPlaylist) {
  if (!uploadsPlaylist) return null;
  const ids = [];
  let pageToken = "";
  for (let page = 0; page < 40; page++) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=50&key=${YT_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const r = await fetch(url);
    if (!r.ok) break;
    const d = await r.json();
    for (const it of d.items || []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    pageToken = d.nextPageToken || "";
    if (!pageToken) break;
  }
  const episodes = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).join(",");
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${batch}&key=${YT_API_KEY}`);
    if (!r.ok) continue;
    const d = await r.json();
    for (const v of d.items || []) {
      const secs = isoDurationToSeconds(v.contentDetails?.duration);
      if (secs >= MIN_EPISODE_MINUTES * 60) {
        episodes.push({ id: v.id, title: v.snippet?.title, publishedAt: v.snippet?.publishedAt, seconds: secs, views: parseInt(v.statistics?.viewCount || "0") });
      }
    }
  }
  episodes.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const avgSeconds = episodes.length ? Math.round(episodes.reduce((s, e) => s + e.seconds, 0) / episodes.length) : 0;
  return {
    count: episodes.length,
    minMinutes: MIN_EPISODE_MINUTES,
    scannedUploads: ids.length,
    avgMinutes: Math.round(avgSeconds / 60),
    latest: episodes.slice(0, 3).map((e) => ({ id: e.id, title: e.title, publishedAt: e.publishedAt, minutes: Math.round(e.seconds / 60), views: e.views })),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  if (req.method === "OPTIONS") return res.status(200).end();

  const out = { fetchedAt: new Date().toISOString(), snapshot: null, live: { youtube: null, instagram: null }, episodes: null, errors: [] };

  const [snap, yt, ig] = await Promise.all([
    getSnapshot().catch((e) => { out.errors.push("snapshot: " + e.message); return null; }),
    getYouTube().catch((e) => { out.errors.push("youtube: " + e.message); return null; }),
    getInstagram().catch((e) => { out.errors.push("instagram: " + e.message); return null; }),
  ]);
  out.snapshot = snap;
  out.live.youtube = yt ? { subscribers: yt.subscribers, totalViews: yt.totalViews, videoCount: yt.videoCount } : null;
  out.live.instagram = ig;

  if (req.query.episodes !== "0") {
    out.episodes = await getEpisodes(yt?.uploadsPlaylist).catch((e) => { out.errors.push("episodes: " + e.message); return null; });
  }

  return res.status(200).json(out);
}
