// /api/ig-boost-recommendations.js — Returns latest computed recommendations
// Reads from Supabase (populated by cron at 8 AM UTC daily)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    // Get the most recent computed_at timestamp, then all rows with that timestamp
    const latestUrl = `${SUPABASE_URL}/rest/v1/ig_boost_recommendations?select=computed_at&order=computed_at.desc&limit=1`;
    const latestResp = await fetch(latestUrl, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    
    if (!latestResp.ok) throw new Error(`Supabase query failed: ${latestResp.status}`);
    const latestData = await latestResp.json();
    
    if (!latestData.length) {
      return res.status(200).json({ recommendations: [], computed_at: null });
    }

    const latestTs = latestData[0].computed_at;
    const recsUrl = `${SUPABASE_URL}/rest/v1/ig_boost_recommendations?computed_at=eq.${latestTs}&order=rank.asc`;
    const recsResp = await fetch(recsUrl, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    
    if (!recsResp.ok) throw new Error(`Recommendations fetch failed: ${recsResp.status}`);
    const recommendations = await recsResp.json();

    return res.status(200).json({
      computed_at: latestTs,
      count: recommendations.length,
      recommendations,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
