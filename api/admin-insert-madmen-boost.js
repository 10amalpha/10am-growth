// /api/admin-insert-madmen-boost.js — ONE-SHOT admin endpoint
// Inserts the first boost (Madmen / E204) with baselines captured at 2026-04-19 15:27 UTC
// Call once with ?pass=elgordo, then this file gets deleted.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  if (req.query.pass !== (process.env.ADMIN_PASS || "elgordo")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = {
    media_id: "17941655139012213",
    permalink: "https://www.instagram.com/reel/DXAk65RjSnQ/",
    caption: "Donald Trump y la teoría del Madmen.",
    landing_url: "https://www.10am.pro/p/e204-estados-unidos-en-busca-del?utm_source=ig&utm_medium=boost&utm_campaign=e204_usa_abr26",
    utm_campaign: "e204_usa_abr26",
    budget_usd: 98,
    duration_days: 7,
    status: "active",
    notes: "Primer boost del sistema. Goal: Get more website visitors. Button: Sign up. Advantage+ creative OFF. Pago: Visa 6491 (Tareasplus). End date: 26 abr 2026.",
    baseline_views: 6916,
    baseline_reach: 4684,
    baseline_likes: 250,
    baseline_comments: 10,
    baseline_shares: 66,
    baseline_saves: 23,
    baseline_follows: 0,
    baseline_profile_visits: 0,
    baseline_engagement_rate: 5.05,
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

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: "Insert failed", status: resp.status, detail: errText });
    }

    const inserted = await resp.json();
    return res.status(200).json({ ok: true, inserted: inserted[0] || inserted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
