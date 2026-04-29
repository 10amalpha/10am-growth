// /api/gumroad-cleanup.js — Vercel Serverless Function
// Manages gumroad_to_remove table — completely separate from churn_removed
// GET: list all entries with their removed status
// POST: mark an email as removed (or unmark)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bzpraigsuwgjgpnclcpd.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  const pass = req.query.pass || req.body?.pass;
  if (pass !== (process.env.ADMIN_PASS || "elgordo")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET — list all Gumroad cleanup entries
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("gumroad_to_remove")
      .select("*")
      .order("expired_date", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const all = data || [];
    const pending = all.filter((r) => !r.removed_at);
    const done = all.filter((r) => !!r.removed_at);

    return res.status(200).json({
      total: all.length,
      pending: pending.length,
      done: done.length,
      entries: all,
    });
  }

  // POST — toggle remove status
  if (req.method === "POST") {
    const { email, action, notes } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    if (action === "uncheck") {
      // Set removed_at back to null
      const { error } = await supabase
        .from("gumroad_to_remove")
        .update({ removed_at: null, removed_by: null, notes: null })
        .eq("email", email);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, action: "unchecked", email });
    } else {
      // Mark as removed (default)
      const { error } = await supabase
        .from("gumroad_to_remove")
        .update({
          removed_at: new Date().toISOString(),
          removed_by: "hernan",
          notes: notes || null,
        })
        .eq("email", email);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, action: "checked", email });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
