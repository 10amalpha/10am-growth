// /api/churn-removed.js — Vercel Serverless Function
// Multi-table router: handles both `churn_removed` (Stripe) and `gumroad_to_remove` (Gumroad)
// Selected via ?table=gumroad query param. Defaults to churn_removed for backward compat.

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

  const isGumroad = req.query.table === "gumroad";

  // GUMROAD branch
  if (isGumroad) {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("gumroad_to_remove")
        .select("*")
        .order("expired_date", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const all = data || [];
      return res.status(200).json({
        total: all.length,
        pending: all.filter((r) => !r.removed_at).length,
        done: all.filter((r) => !!r.removed_at).length,
        entries: all,
      });
    }
    if (req.method === "POST") {
      const { email, action } = req.body;
      if (!email) return res.status(400).json({ error: "email required" });
      const update =
        action === "uncheck"
          ? { removed_at: null, removed_by: null }
          : { removed_at: new Date().toISOString(), removed_by: "hernan" };
      const { error } = await supabase
        .from("gumroad_to_remove")
        .update(update)
        .eq("email", email);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({
        ok: true,
        action: action === "uncheck" ? "unchecked" : "checked",
        email,
      });
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  // STRIPE branch (original)
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("churn_removed")
      .select("*")
      .order("removed_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ removed: data || [] });
  }
  if (req.method === "POST") {
    const { email, action } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });
    if (action === "remove") {
      const { error } = await supabase
        .from("churn_removed")
        .delete()
        .eq("email", email);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, action: "unchecked", email });
    } else {
      const { error } = await supabase.from("churn_removed").upsert(
        { email, removed_at: new Date().toISOString(), removed_by: "hernan" },
        { onConflict: "email" }
      );
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, action: "checked", email });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
