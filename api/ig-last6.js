// /api/ig-last6.js — Debug: últimos 6 posts en IG sin filtros
const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_TOKEN) return res.status(500).json({ error: "IG_ACCESS_TOKEN not set" });
  try {
    const ptUrl = `https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_TOKEN}`;
    const ptResp = await fetch(ptUrl);
    const { access_token: pageToken } = await ptResp.json();
    const mediaUrl = `https://graph.facebook.com/v22.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=6&access_token=${pageToken}`;
    const mResp = await fetch(mediaUrl);
    const mediaData = await mResp.json();
    return res.status(200).json({ last6: mediaData.data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
