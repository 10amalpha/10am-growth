// /api/admin-mark-rejected.js — ONE-SHOT
// Marks boost ID:1 (Madmen/E204) as rejected by Meta for political content classifier
// Called once, then deleted.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  if (req.query.pass !== (process.env.ADMIN_PASS || "elgordo")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_tracking?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        status: "rejected",
        emails_attributed: 0,
        paid_subs_attributed: 0,
        completed_at: new Date().toISOString(),
        notes: "REJECTED by Meta's political content classifier (Apr 19 2026). Clip mentions Donald Trump — auto-flagged as political ad. Never delivered — $0 spent. Retry with a non-political clip. Lesson: avoid clips naming political figures.",
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: "Update failed", detail: err });
    }
    const updated = await resp.json();
    return res.status(200).json({ ok: true, updated });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
