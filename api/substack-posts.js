// /api/substack-posts.js — Fetches latest 50 posts from 10am.pro via RSS
// Used by IG Boost tab to populate the landing URL dropdown

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  try {
    const rssResp = await fetch("https://10am.pro/feed", {
      headers: { "User-Agent": "10AMPRO-Growth-Dashboard/1.0" },
    });
    
    if (!rssResp.ok) throw new Error(`RSS fetch failed: ${rssResp.status}`);
    const xml = await rssResp.text();

    // Simple RSS parse — extract <item> blocks
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>([^<]+)<\/link>/;
    const pubDateRegex = /<pubDate>([^<]+)<\/pubDate>/;
    const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 50) {
      const block = match[1];
      const title = titleRegex.exec(block)?.[1]?.trim() || "";
      const link = linkRegex.exec(block)?.[1]?.trim() || "";
      const pubDate = pubDateRegex.exec(block)?.[1]?.trim() || "";
      const description = descRegex.exec(block)?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) || "";
      
      if (title && link) {
        items.push({
          title,
          url: link,
          published_at: pubDate ? new Date(pubDate).toISOString() : null,
          description,
        });
      }
    }

    // Add special options — subscribe page first (best fallback), homepage last (worst converter)
    const specials = [
      { title: "⭐ Subscribe (10am.pro/subscribe)", url: "https://10am.pro/subscribe", published_at: null, description: "Best fallback — un solo CTA de email capture" },
      { title: "⚠️ Homepage (10am.pro) — 1.3% conv, usar solo como último recurso", url: "https://10am.pro", published_at: null, description: "Landing genérica. Conversión histórica baja." },
    ];

    return res.status(200).json({
      count: items.length,
      specials,
      posts: items,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
