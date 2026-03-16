// /api/channel-stats.js — Vercel Serverless Function
// Fetches live channel-level stats from YouTube + Instagram APIs
// YouTube: subscriber count, view count via Data API v3
// Instagram: follower count via Graph API v22.0

const YT_API_KEY = process.env.YT_API_KEY || "AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw";
const YT_CHANNEL_ID = "UC1yKEFqN6Tzz9DTK7fwS3LQ";
const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  if (req.method === "OPTIONS") return res.status(200).end();

  const result = { youtube: null, instagram: null, fetchedAt: new Date().toISOString() };

  // ── YouTube Channel Stats ──
  try {
    const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;
    const ytResp = await fetch(ytUrl);
    if (ytResp.ok) {
      const ytData = await ytResp.json();
      if (ytData.items && ytData.items.length > 0) {
        const stats = ytData.items[0].statistics;
        result.youtube = {
          subscribers: parseInt(stats.subscriberCount || "0"),
          totalViews: parseInt(stats.viewCount || "0"),
          videoCount: parseInt(stats.videoCount || "0"),
        };
      }
    }
  } catch (e) {
    result.youtube = null;
  }

  // ── Instagram Follower Count ──
  const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (IG_ACCESS_TOKEN) {
    try {
      const pageTokenUrl = `https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_ACCESS_TOKEN}`;
      const ptResp = await fetch(pageTokenUrl);
      if (ptResp.ok) {
        const ptData = await ptResp.json();
        const pageToken = ptData.access_token;
        if (pageToken) {
          const igUrl = `https://graph.facebook.com/v22.0/${IG_USER_ID}?fields=followers_count,media_count&access_token=${pageToken}`;
          const igResp = await fetch(igUrl);
          if (igResp.ok) {
            const igData = await igResp.json();
            result.instagram = {
              followers: igData.followers_count || 0,
              mediaCount: igData.media_count || 0,
            };
          }
        }
      }
    } catch (e) {
      result.instagram = null;
    }
  }

  return res.status(200).json(result);
}
