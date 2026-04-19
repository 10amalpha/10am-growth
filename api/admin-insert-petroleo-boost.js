// /api/admin-insert-petroleo-boost.js — ONE-SHOT
// Inserts boost #2: "La transición energética tumbará el precio del petróleo" (e204)
// Baselines from live fetch Apr 19 16:35 UTC

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  if (req.query.pass !== (process.env.ADMIN_PASS || "elgordo")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = {
    media_id: "17874834840589986",
    permalink: "https://www.instagram.com/reel/DXMyko7DcFL/",
    caption: "La transición energética tumbará el precio del petróleo",
    landing_url: "https://www.10am.pro/p/e204-estados-unidos-en-busca-del?utm_source=ig&utm_medium=boost&utm_campaign=petroleo_abr26",
    utm_campaign: "petroleo_abr26",
    budget_usd: 98,
    duration_days: 7,
    status: "active",
    notes: "Retry después del rechazo por Trump. Tema energético puro, sin riesgo político. Clip despierta curiosidad sobre tesis bajista del petróleo; landing expande el Imperio Energético EEUU. Goal: que oigan todo el episodio e204.",
    baseline_views: 3041,
    baseline_reach: 2014,
    baseline_likes: 101,
    baseline_comments: 0,
    baseline_shares: 32,
    baseline_saves: 8,
    baseline_follows: 0,
    baseline_profile_visits: 0,
    baseline_engagement_rate: 4.64,
    baseline_follows_per_1k: 0,
  };

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_tracking`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) return res.status(500).json({ error: await resp.text() });
    const inserted = await resp.json();
    return res.status(200).json({ ok: true, inserted: inserted[0] || inserted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
