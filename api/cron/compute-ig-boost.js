// /api/cron/compute-ig-boost.js — Vercel Cron Job (daily 8 AM UTC)
// Fetches last 28 days of IG reels, scores them for boost-worthiness, upserts to Supabase.
// Scoring prioritizes CONVERSION SIGNALS (follows, saves, profile_visits) over vanity metrics.
// Only clips ≤60s are eligible for IG's native Boost button.

const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_ANON_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK;

export default async function handler(req, res) {
  // Auth: cron secret OR admin pass
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const pass = req.query.pass;
    if (pass !== (process.env.ADMIN_PASS || "elgordo")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_TOKEN) return res.status(500).json({ error: "IG_ACCESS_TOKEN not set" });

  try {
    // 1. Exchange for Page Token
    const ptUrl = `https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_TOKEN}`;
    const ptResp = await fetch(ptUrl);
    if (!ptResp.ok) throw new Error(`Page token failed: ${ptResp.status}`);
    const { access_token: pageToken } = await ptResp.json();
    if (!pageToken) throw new Error("No page token returned");

    // 2. Fetch recent media (last 100, will filter to 28d below)
    const mediaUrl = `https://graph.facebook.com/v22.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=100&access_token=${pageToken}`;
    const mResp = await fetch(mediaUrl);
    if (!mResp.ok) throw new Error(`Media fetch failed: ${mResp.status}`);
    const { data: media } = await mResp.json();
    if (!media?.length) return res.status(200).json({ ok: true, clips: 0, msg: "No media" });

    // 3. Filter: REELS only, last 28 days
    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const reels = media.filter(m => {
      const isReel = m.media_product_type === "REELS" || m.media_type === "VIDEO";
      const recent = new Date(m.timestamp).getTime() >= cutoff;
      return isReel && recent;
    });

    // 4. For each reel, fetch insights + duration
    const debugMode = req.query.debug === "1";
    const debugInfo = [];
    const clips = [];
    for (const reel of reels) {
      try {
        // Try multiple possible duration fields (Meta API inconsistency)
        const durUrl = `https://graph.facebook.com/v22.0/${reel.id}?fields=video_duration,media_type,media_product_type&access_token=${pageToken}`;
        const durResp = await fetch(durUrl);
        const durData = durResp.ok ? await durResp.json() : {};
        let duration = null;
        if (durData.video_duration) duration = Number(durData.video_duration);
        
        if (debugMode && debugInfo.length < 3) {
          debugInfo.push({ reel_id: reel.id, durResp_status: durResp.status, durData });
        }

        // Insights: views, reach, shares, saves, follows, profile_visits
        const metrics = ["views", "reach", "shares", "saved", "follows", "profile_visits"];
        const insUrl = `https://graph.facebook.com/v22.0/${reel.id}/insights?metric=${metrics.join(",")}&access_token=${pageToken}`;
        const insResp = await fetch(insUrl);
        const insData = insResp.ok ? await insResp.json() : { data: [] };
        
        const m = {};
        (insData.data || []).forEach(item => {
          m[item.name] = item.values?.[0]?.value || 0;
        });

        // Fallback for views: ig_reels_aggregated_all_plays_count if views=0
        if (!m.views) {
          const fbUrl = `https://graph.facebook.com/v22.0/${reel.id}/insights?metric=ig_reels_aggregated_all_plays_count&access_token=${pageToken}`;
          const fbResp = await fetch(fbUrl);
          if (fbResp.ok) {
            const fbData = await fbResp.json();
            m.views = fbData.data?.[0]?.values?.[0]?.value || 0;
          }
        }

        clips.push({
          media_id: reel.id,
          permalink: reel.permalink,
          caption: reel.caption || "",
          thumbnail_url: reel.thumbnail_url || null,
          duration_sec: duration,
          published_at: reel.timestamp,
          views: m.views || 0,
          reach: m.reach || 0,
          likes: reel.like_count || 0,
          comments: reel.comments_count || 0,
          shares: m.shares || 0,
          saves: m.saved || 0,
          follows: m.follows || 0,
          profile_visits: m.profile_visits || 0,
        });
      } catch (e) {
        console.error(`Failed reel ${reel.id}:`, e.message);
      }
    }

    // 5. Score each clip — only eligible ones (≤60s) get real scores
    const scored = clips.map(c => {
      const views = Math.max(c.views, 1);
      const follows_per_1k = (c.follows / views) * 1000;
      const saves_per_1k = (c.saves / views) * 1000;
      const profile_visits_per_1k = (c.profile_visits / views) * 1000;
      const engagement_rate = ((c.likes + c.comments + c.shares + c.saves) / views) * 100;

      // Weighted score: follows >> saves > profile_visits > engagement
      const score =
        (follows_per_1k * 3) +
        (saves_per_1k * 2) +
        (profile_visits_per_1k * 1.5) +
        (engagement_rate * 10);

      // Eligibility: ≤60s OR unknown (IG Boost hard limit — if API didn't return duration, include it and let user verify visually)
      const boost_eligible = c.duration_sec === null || c.duration_sec <= 60;

      return { ...c, follows_per_1k, saves_per_1k, profile_visits_per_1k, engagement_rate, score, boost_eligible };
    });

    // 6. Viral filter: exclude outliers (views > 3x median of eligible clips)
    const eligibleViews = scored.filter(c => c.boost_eligible).map(c => c.views).sort((a, b) => a - b);
    const median = eligibleViews.length ? eligibleViews[Math.floor(eligibleViews.length / 2)] : 0;
    const viralThreshold = median * 3;

    const recommendations = scored
      .filter(c => c.boost_eligible)
      .filter(c => c.views <= viralThreshold || viralThreshold === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 7. Generate reasoning for top clips
    const withReasoning = recommendations.map((c, i) => {
      const reasons = [];
      if (c.follows_per_1k >= 2) reasons.push(`${c.follows_per_1k.toFixed(1)} follows/1K (alta intención de marca)`);
      else if (c.follows_per_1k >= 1) reasons.push(`${c.follows_per_1k.toFixed(1)} follows/1K (buena intención)`);
      if (c.engagement_rate >= 5) reasons.push(`ER ${c.engagement_rate.toFixed(1)}% — Meta amplifica más`);
      else if (c.engagement_rate >= 3.5) reasons.push(`ER ${c.engagement_rate.toFixed(1)}% — engagement sólido`);
      if (c.saves_per_1k >= 3) reasons.push(`${c.saves_per_1k.toFixed(1)} saves/1K (contenido de referencia)`);
      if (reasons.length === 0) reasons.push(`Score compuesto ${c.score.toFixed(1)}`);
      
      return {
        ...c,
        rank: i + 1,
        reasoning: reasons.join(" · "),
      };
    });

    // 8. Upsert to Supabase via REST
    const computed_at = new Date().toISOString();
    
    // First, clear old recommendations (keep last 7 days for history)
    const deleteCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_recommendations?computed_at=lt.${deleteCutoff}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    }).catch(() => {});

    // Insert new batch
    const rows = withReasoning.map(c => ({
      computed_at,
      rank: c.rank,
      media_id: c.media_id,
      permalink: c.permalink,
      caption: c.caption?.slice(0, 1000),
      thumbnail_url: c.thumbnail_url,
      duration_sec: c.duration_sec,
      published_at: c.published_at,
      views: c.views,
      reach: c.reach,
      likes: c.likes,
      comments: c.comments,
      shares: c.shares,
      saves: c.saves,
      follows: c.follows,
      profile_visits: c.profile_visits,
      follows_per_1k: Number(c.follows_per_1k.toFixed(2)),
      saves_per_1k: Number(c.saves_per_1k.toFixed(2)),
      profile_visits_per_1k: Number(c.profile_visits_per_1k.toFixed(2)),
      engagement_rate: Number(c.engagement_rate.toFixed(2)),
      score: Number(c.score.toFixed(2)),
      reasoning: c.reasoning,
    }));

    const insResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_recommendations`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!insResp.ok) {
      const errText = await insResp.text();
      return res.status(500).json({ error: "Supabase insert failed", detail: errText, rows: rows.length });
    }

    return res.status(200).json({
      ok: true,
      computed_at,
      reels_scanned: reels.length,
      eligible: scored.filter(c => c.boost_eligible).length,
      recommendations: rows.length,
      top_3: withReasoning.slice(0, 3).map(c => ({
        rank: c.rank,
        caption: c.caption?.slice(0, 80),
        score: c.score.toFixed(1),
        reasoning: c.reasoning,
      })),
      ...(debugMode && { debug: debugInfo }),
    });
  } catch (e) {
    console.error("Cron error:", e);
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  maxDuration: 60,
};
