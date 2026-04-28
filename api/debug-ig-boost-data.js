// /api/debug-ig-boost-data.js — debug endpoint, returns raw table contents
const SUPABASE_URL = "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ig_boost_tracking?select=*&order=boosted_at.desc.nullslast`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    const summary = {
      total: rows.length,
      by_status: rows.reduce((a, r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {}),
      latest_boosted_at: rows[0]?.boosted_at || null,
      rows_with_emails: rows.filter(r => r.emails_attributed > 0).length,
      rows_with_paid: rows.filter(r => r.paid_subs_attributed > 0).length,
      total_invested_usd: rows.reduce((s, r) => s + (Number(r.budget_usd) || 0), 0),
    };
    return res.status(200).json({ summary, rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
