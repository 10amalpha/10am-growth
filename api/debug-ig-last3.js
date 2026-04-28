// /api/debug-ig-last3.js — fetches last 3 IG posts directly from Meta
const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_TOKEN) return res.status(500).json({ error: "IG_ACCESS_TOKEN not set" });
  try {
    const ptResp = await fetch(`https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_TOKEN}`);
    const { access_token: pageToken } = await ptResp.json();
    const mUrl = `https://graph.facebook.com/v22.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=3&access_token=${pageToken}`;
    const mResp = await fetch(mUrl);
    const data = await mResp.json();
    return res.status(200).json({
      now: new Date().toISOString(),
      count: (data.data || []).length,
      posts: (data.data || []).map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        type: p.media_type,
        product_type: p.media_product_type,
        permalink: p.permalink,
        caption_preview: (p.caption || "").slice(0, 200),
        likes: p.like_count,
        comments: p.comments_count,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
