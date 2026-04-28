// /api/ig-boost-live.js — Live fetch from Meta + scoring in one call
// Called by the IG Boost tab on every load. ~30 sec response time.
// Replaces cron-based approach (no Supabase cache, always fresh).

const FB_PAGE_ID = "1060185473841846";
const IG_USER_ID = "17841455171483266";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store"); // Always fresh

  const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_TOKEN) return res.status(500).json({ error: "IG_ACCESS_TOKEN not set" });

  try {
    // ── 1. Page Token ──
    const ptUrl = `https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_TOKEN}`;
    const ptResp = await fetch(ptUrl);
    if (!ptResp.ok) throw new Error(`Page token failed: ${ptResp.status}`);
    const { access_token: pageToken } = await ptResp.json();
    if (!pageToken) throw new Error("No page token returned");

    // ── 2. Fetch recent media ──
    const mediaUrl = `https://graph.facebook.com/v22.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=100&access_token=${pageToken}`;
    const mResp = await fetch(mediaUrl);
    if (!mResp.ok) throw new Error(`Media fetch failed: ${mResp.status}`);
    const mediaData = await mResp.json();

    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const reels = (mediaData.data || []).filter(m => {
      const isReel = m.media_product_type === "REELS" || m.media_type === "VIDEO";
      const recent = new Date(m.timestamp).getTime() >= cutoff;
      return isReel && recent;
    });

    if (!reels.length) {
      return res.status(200).json({ recommendations: [], computed_at: new Date().toISOString(), count: 0 });
    }

    // ── 3. Batch insights — Pass 1: safe metrics (views,reach,shares,saved) ──
    const insightsMap = {};
    reels.forEach(r => { insightsMap[r.id] = { views: 0, reach: 0, shares: 0, saves: 0, follows: 0, profile_visits: 0 }; });

    await batchInsights(reels, pageToken, "views,reach,shares,saved", (mediaId, body) => {
      for (const metric of body.data || []) {
        const val = metric.values?.[0]?.value || 0;
        if (metric.name === "views") insightsMap[mediaId].views = val;
        if (metric.name === "reach") insightsMap[mediaId].reach = val;
        if (metric.name === "shares") insightsMap[mediaId].shares = val;
        if (metric.name === "saved") insightsMap[mediaId].saves = val;
      }
    });

    // ── 4. Batch insights — Pass 2: conversion metrics (follows, profile_visits) ──
    // These may fail per-reel, batch fails gracefully
    await batchInsights(reels, pageToken, "follows,profile_visits", (mediaId, body) => {
      for (const metric of body.data || []) {
        const val = metric.values?.[0]?.value || 0;
        if (metric.name === "follows") insightsMap[mediaId].follows = val;
        if (metric.name === "profile_visits") insightsMap[mediaId].profile_visits = val;
      }
    });

    // ── 5. Fallback for zero views — ig_reels_aggregated_all_plays_count ──
    const zeroViewReels = reels.filter(r => !insightsMap[r.id].views);
    if (zeroViewReels.length > 0) {
      await batchInsights(zeroViewReels, pageToken, "ig_reels_aggregated_all_plays_count", (mediaId, body) => {
        const metric = body.data?.[0];
        const val = metric?.values?.[0]?.value || 0;
        if (val > 0) insightsMap[mediaId].views = val;
      });
    }

    // ── 6. Final fallback for views — use reach as proxy if views still 0 ──
    reels.forEach(r => {
      const ins = insightsMap[r.id];
      if (!ins.views && ins.reach) ins.views = ins.reach;
    });

    // ── 7. Assemble + score ──
    const clips = reels.map(reel => {
      const ins = insightsMap[reel.id];
      const views = Math.max(ins.views, 1); // Avoid div-by-zero
      const follows_per_1k = (ins.follows / views) * 1000;
      const saves_per_1k = (ins.saves / views) * 1000;
      const profile_visits_per_1k = (ins.profile_visits / views) * 1000;
      const likes = reel.like_count || 0;
      const comments = reel.comments_count || 0;
      const engagement_rate = ((likes + comments + ins.shares + ins.saves) / views) * 100;

      const score =
        (follows_per_1k * 3) +
        (saves_per_1k * 2) +
        (profile_visits_per_1k * 1.5) +
        (engagement_rate * 10);

      return {
        media_id: reel.id,
        permalink: reel.permalink,
        caption: reel.caption || "",
        thumbnail_url: reel.thumbnail_url || null,
        duration_sec: null, // Meta API doesn't expose for reels — UI handles "?"
        published_at: reel.timestamp,
        views: ins.views,
        reach: ins.reach,
        likes,
        comments,
        shares: ins.shares,
        saves: ins.saves,
        follows: ins.follows,
        profile_visits: ins.profile_visits,
        follows_per_1k: Number(follows_per_1k.toFixed(2)),
        saves_per_1k: Number(saves_per_1k.toFixed(2)),
        profile_visits_per_1k: Number(profile_visits_per_1k.toFixed(2)),
        engagement_rate: Number(engagement_rate.toFixed(2)),
        score: Number(score.toFixed(2)),
      };
    });

    // RAW MODE: enriched with views/likes/saves, sorted newest first, no filters
    if (req.query.raw === "1") {
      return res.status(200).json({
        now: new Date().toISOString(),
        count: clips.length,
        reels: [...clips]
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
          .map(c => ({
            timestamp: c.published_at,
            permalink: c.permalink,
            caption: (c.caption || "").slice(0, 150),
            views: c.views,
            reach: c.reach,
            likes: c.likes,
            comments: c.comments,
            shares: c.shares,
            saves: c.saves,
            engagement_rate: c.engagement_rate,
          })),
      });
    }

    // ── 8. Exclude already-viral (views > 3x median) ──
    const sortedViews = [...clips].map(c => c.views).sort((a, b) => a - b);
    const median = sortedViews.length ? sortedViews[Math.floor(sortedViews.length / 2)] : 0;
    const viralThreshold = median * 3;

    // ── 9. Rank + reasoning ──
    // Age-aware threshold: fresh reels (<72h) bypass the 500-view floor
    // since they haven't had time to accumulate views yet
    const FRESH_HOURS = 72;
    const now = Date.now();
    const ranked = clips
      .map(c => ({
        ...c,
        age_hours: (now - new Date(c.published_at).getTime()) / 3600000,
      }))
      .filter(c => viralThreshold === 0 || c.views <= viralThreshold)
      .filter(c => c.age_hours < FRESH_HOURS || c.views >= 500)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((c, i) => {
        const reasons = [];
        if (c.age_hours < FRESH_HOURS) reasons.push(`🆕 ${c.age_hours.toFixed(0)}h — recién publicado`);
        if (c.follows_per_1k >= 2) reasons.push(`${c.follows_per_1k.toFixed(1)} follows/1K — alta intención de marca`);
        else if (c.follows_per_1k >= 1) reasons.push(`${c.follows_per_1k.toFixed(1)} follows/1K — buena intención`);
        if (c.engagement_rate >= 5) reasons.push(`ER ${c.engagement_rate.toFixed(1)}% — Meta amplifica más`);
        else if (c.engagement_rate >= 3.5) reasons.push(`ER ${c.engagement_rate.toFixed(1)}% — engagement sólido`);
        if (c.saves_per_1k >= 3) reasons.push(`${c.saves_per_1k.toFixed(1)} saves/1K — contenido de referencia`);
        if (c.profile_visits_per_1k >= 5) reasons.push(`${c.profile_visits_per_1k.toFixed(1)} profile visits/1K`);
        if (reasons.length === 0) reasons.push(`Score compuesto ${c.score.toFixed(1)}`);
        
        return {
          ...c,
          rank: i + 1,
          is_fresh: c.age_hours < FRESH_HOURS,
          reasoning: reasons.slice(0, 2).join(" · "),
        };
      });

    return res.status(200).json({
      computed_at: new Date().toISOString(),
      reels_scanned: reels.length,
      median_views: median,
      viral_threshold: viralThreshold,
      count: ranked.length,
      recommendations: ranked,
    });
  } catch (e) {
    console.error("Live fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}

// Batch insights helper — uses Meta Batch API (50 reels per call)
async function batchInsights(reels, pageToken, metrics, onResult) {
  for (let i = 0; i < reels.length; i += 50) {
    const chunk = reels.slice(i, i + 50);
    const batch = chunk.map(r => ({
      method: "GET",
      relative_url: `${r.id}/insights?metric=${metrics}`,
    }));

    try {
      const resp = await fetch(`https://graph.facebook.com/v22.0/?access_token=${encodeURIComponent(pageToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: JSON.stringify(batch) }),
      });

      if (!resp.ok) continue;
      const results = await resp.json();
      results.forEach((result, idx) => {
        if (result.code !== 200) return;
        try {
          const body = JSON.parse(result.body);
          onResult(chunk[idx].id, body);
        } catch (e) { /* skip malformed */ }
      });
    } catch (e) { /* skip batch errors */ }
  }
}

export const config = {
  maxDuration: 60,
};
