// /api/ig-boost-metrics.js — GET current metrics for specific media IDs
// Used by the tracking history to compute "boost growth" deltas.
// Query: ?ids=mediaId1,mediaId2,...

const FB_PAGE_ID = "1060185473841846";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const idsParam = req.query.ids;
  if (!idsParam) return res.status(400).json({ error: "Missing ids param" });
  const mediaIds = idsParam.split(",").map(s => s.trim()).filter(Boolean);
  if (!mediaIds.length) return res.status(400).json({ error: "Empty ids list" });

  const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
  if (!IG_TOKEN) return res.status(500).json({ error: "IG_ACCESS_TOKEN not set" });

  try {
    // Page token
    const ptUrl = `https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=access_token&access_token=${IG_TOKEN}`;
    const ptResp = await fetch(ptUrl);
    if (!ptResp.ok) throw new Error(`Page token failed: ${ptResp.status}`);
    const { access_token: pageToken } = await ptResp.json();

    // Fetch media + insights via Batch API
    const results = {};
    mediaIds.forEach(id => { results[id] = { media_id: id, found: false }; });

    // Batch 1: get media fields (like_count, comments_count)
    const mediaBatch = mediaIds.map(id => ({
      method: "GET",
      relative_url: `${id}?fields=id,caption,timestamp,like_count,comments_count,permalink`,
    }));

    const mediaResp = await fetch(`https://graph.facebook.com/v22.0/?access_token=${encodeURIComponent(pageToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: JSON.stringify(mediaBatch) }),
    });

    if (mediaResp.ok) {
      const batch = await mediaResp.json();
      batch.forEach((item, i) => {
        if (item.code === 200) {
          try {
            const body = JSON.parse(item.body);
            const id = mediaIds[i];
            results[id] = {
              ...results[id],
              found: true,
              likes: body.like_count || 0,
              comments: body.comments_count || 0,
              permalink: body.permalink,
            };
          } catch (e) { /* skip */ }
        }
      });
    }

    // Batch 2: insights (views, reach, shares, saved)
    const insightsBatch = mediaIds.map(id => ({
      method: "GET",
      relative_url: `${id}/insights?metric=views,reach,shares,saved`,
    }));

    const insResp = await fetch(`https://graph.facebook.com/v22.0/?access_token=${encodeURIComponent(pageToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: JSON.stringify(insightsBatch) }),
    });

    if (insResp.ok) {
      const batch = await insResp.json();
      batch.forEach((item, i) => {
        if (item.code === 200) {
          try {
            const body = JSON.parse(item.body);
            const id = mediaIds[i];
            for (const metric of body.data || []) {
              const val = metric.values?.[0]?.value || 0;
              if (metric.name === "views") results[id].views = val;
              if (metric.name === "reach") results[id].reach = val;
              if (metric.name === "shares") results[id].shares = val;
              if (metric.name === "saved") results[id].saves = val;
            }
          } catch (e) { /* skip */ }
        }
      });
    }

    // Batch 3: conversion metrics (follows, profile_visits) — may fail gracefully
    const convBatch = mediaIds.map(id => ({
      method: "GET",
      relative_url: `${id}/insights?metric=follows,profile_visits`,
    }));

    const convResp = await fetch(`https://graph.facebook.com/v22.0/?access_token=${encodeURIComponent(pageToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: JSON.stringify(convBatch) }),
    });

    if (convResp.ok) {
      const batch = await convResp.json();
      batch.forEach((item, i) => {
        if (item.code === 200) {
          try {
            const body = JSON.parse(item.body);
            const id = mediaIds[i];
            for (const metric of body.data || []) {
              const val = metric.values?.[0]?.value || 0;
              if (metric.name === "follows") results[id].follows = val;
              if (metric.name === "profile_visits") results[id].profile_visits = val;
            }
          } catch (e) { /* skip */ }
        }
      });
    }

    // Fill defaults for missing
    mediaIds.forEach(id => {
      const r = results[id];
      r.views = r.views || 0;
      r.reach = r.reach || 0;
      r.likes = r.likes || 0;
      r.comments = r.comments || 0;
      r.shares = r.shares || 0;
      r.saves = r.saves || 0;
      r.follows = r.follows || 0;
      r.profile_visits = r.profile_visits || 0;
    });

    return res.status(200).json({
      fetched_at: new Date().toISOString(),
      count: mediaIds.length,
      metrics: results,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  maxDuration: 30,
};
