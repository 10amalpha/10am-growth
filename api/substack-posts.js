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

    // Add special option for homepage + subscribe page
    const specials = [
      { title: "— Homepage (10am.pro)", url: "https://10am.pro", published_at: null, description: "Landing genérica" },
      { title: "— Subscribe (10am.pro/subscribe)", url: "https://10am.pro/subscribe", published_at: null, description: "Página de suscripción directa" },
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
