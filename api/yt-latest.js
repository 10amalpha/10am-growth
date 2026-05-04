// /api/yt-latest.js — Vercel Serverless Function
// Returns the latest N uploads from the 10ampro YouTube channel with
// title, publishedAt, videoId, view/like/comment counts, and duration.
// Strategy:
//   1. channels.list → contentDetails.relatedPlaylists.uploads (the upload playlist ID)
//   2. playlistItems.list → first N items (most recent uploads, ordered newest-first)
//   3. videos.list → batch stats + contentDetails for those video IDs

const YT_API_KEY = process.env.YT_API_KEY || "AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw";
const YT_CHANNEL_ID = "UC1yKEFqN6Tzz9DTK7fwS3LQ";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");

  if (req.method === "OPTIONS") return res.status(200).end();

  const limit = Math.min(parseInt(req.query.limit || "8", 10), 25);

  try {
    // 1) Get the uploads playlist ID for the channel
    const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
    const chResp = await fetch(chUrl);
    if (!chResp.ok) {
      return res.status(502).json({ error: "channels.list failed", status: chResp.status });
    }
    const chData = await chResp.json();
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) {
      return res.status(500).json({ error: "uploads playlist not found" });
    }

    // 2) Get the latest items from the uploads playlist
    const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${limit}&key=${YT_API_KEY}`;
    const plResp = await fetch(plUrl);
    if (!plResp.ok) {
      return res.status(502).json({ error: "playlistItems.list failed", status: plResp.status });
    }
    const plData = await plResp.json();
    const items = plData.items || [];
    const videoIds = items.map((it) => it.contentDetails?.videoId).filter(Boolean);

    if (videoIds.length === 0) {
      return res.status(200).json({ videos: [], fetchedAt: new Date().toISOString() });
    }

    // 3) Batch-fetch stats + contentDetails for those video IDs
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}&key=${YT_API_KEY}`;
    const vResp = await fetch(vUrl);
    if (!vResp.ok) {
      return res.status(502).json({ error: "videos.list failed", status: vResp.status });
    }
    const vData = await vResp.json();
    const byId = {};
    for (const v of vData.items || []) byId[v.id] = v;

    // 4) Compose ordered response (newest first, in playlist order)
    const videos = videoIds.map((id) => {
      const v = byId[id];
      if (!v) return { videoId: id, error: "not found" };
      return {
        videoId: id,
        title: v.snippet?.title || null,
        publishedAt: v.snippet?.publishedAt || null,
        description: (v.snippet?.description || "").slice(0, 400),
        duration: v.contentDetails?.duration || null,
        views: parseInt(v.statistics?.viewCount || "0", 10),
        likes: parseInt(v.statistics?.likeCount || "0", 10),
        comments: parseInt(v.statistics?.commentCount || "0", 10),
        thumbnail: v.snippet?.thumbnails?.medium?.url || null,
        url: `https://youtu.be/${id}`,
      };
    });

    return res.status(200).json({
      channelId: YT_CHANNEL_ID,
      uploadsPlaylistId: uploadsId,
      count: videos.length,
      videos,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "unexpected", message: String(e) });
  }
}
