// /api/ig-boost-tracking.js — Save boost decisions to Supabase
// POST: Hernán presses "Mark as boosted" in the UI → row inserted
// GET: Returns historical boost decisions for the tracking table

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const url = `${SUPABASE_URL}/rest/v1/ig_boost_tracking?order=boosted_at.desc&limit=50`;
      const resp = await fetch(url, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      });
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
      const data = await resp.json();
      return res.status(200).json({ count: data.length, tracking: data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      if (!body?.media_id || !body?.landing_url || !body?.utm_campaign) {
        return res.status(400).json({ error: "Missing required fields: media_id, landing_url, utm_campaign" });
      }

      const row = {
        media_id: body.media_id,
        permalink: body.permalink || null,
        caption: body.caption?.slice(0, 500) || null,
        landing_url: body.landing_url,
        utm_campaign: body.utm_campaign,
        budget_usd: body.budget_usd ? Number(body.budget_usd) : null,
        duration_days: body.duration_days ? Number(body.duration_days) : null,
        status: body.status || "active",
        notes: body.notes || null,
      };

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
        return res.status(500).json({ error: "Insert failed", detail: errText });
      }

      const inserted = await resp.json();
      return res.status(200).json({ ok: true, inserted: inserted[0] || inserted });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
