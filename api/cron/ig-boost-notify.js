// /api/cron/ig-boost-notify.js — Vercel Cron Job
// Runs Mon & Thu at 13:00 UTC (8 AM COT)
// Checks the live IG boost recommendations, emails Hernán if:
//   - Reel ≤30 days old
//   - Score ≥50
//   - Not in "rejected" tracking status
//   - Not alerted about within last 7 days

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzpraigsuwgjgpnclcpd.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHJhaWdzdXdnamdwbmNsY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzk2NDEsImV4cCI6MjA4NTExNTY0MX0.tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE";

const SCORE_THRESHOLD = 50;
const MAX_REEL_AGE_DAYS = 30;
const COOLDOWN_DAYS = 7; // Don't re-alert same reel within this window

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

  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    // 1. Fetch live recommendations (internal call to our own endpoint)
    const host = req.headers.host || "growth.10am.pro";
    const protocol = host.includes("localhost") ? "http" : "https";
    const liveResp = await fetch(`${protocol}://${host}/api/ig-boost-live`);
    if (!liveResp.ok) throw new Error(`Live fetch failed: ${liveResp.status}`);
    const liveData = await liveResp.json();
    const allRecs = liveData.recommendations || [];

    // 2. Fetch Substack posts for landing matching
    const postsResp = await fetch(`${protocol}://${host}/api/substack-posts`);
    const postsData = postsResp.ok ? await postsResp.json() : { posts: [] };
    const posts = postsData.posts || [];

    // 3. Fetch already-rejected media IDs from tracking
    const trackResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_tracking?status=eq.rejected&select=media_id`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    const rejectedRows = trackResp.ok ? await trackResp.json() : [];
    const rejectedIds = new Set(rejectedRows.map(r => r.media_id));

    // 4. Fetch already-boosted media IDs (so we don't re-alert)
    const boostedResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_tracking?status=neq.rejected&select=media_id`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    const boostedRows = boostedResp.ok ? await boostedResp.json() : [];
    const boostedIds = new Set(boostedRows.map(r => r.media_id));

    // 5. Fetch recent alerts to apply cooldown
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const alertsResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_alerts_sent?sent_at=gte.${cooldownCutoff}&select=media_id`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    const recentAlerts = alertsResp.ok ? await alertsResp.json() : [];
    const recentlyAlertedIds = new Set(recentAlerts.map(r => r.media_id));

    // 6. Filter candidates
    const now = Date.now();
    const candidates = allRecs.filter(r => {
      // Must meet score threshold
      if (Number(r.score) < SCORE_THRESHOLD) return false;
      // Must not be rejected
      if (rejectedIds.has(r.media_id)) return false;
      // Must not already be boosted
      if (boostedIds.has(r.media_id)) return false;
      // Must be within age limit
      const ageMs = now - new Date(r.published_at).getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      if (ageDays > MAX_REEL_AGE_DAYS) return false;
      // Must not have been alerted recently
      if (recentlyAlertedIds.has(r.media_id)) return false;
      return true;
    });

    if (candidates.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No new boost opportunities detected — no email sent",
        total_recs: allRecs.length,
        filtered_out: {
          below_score: allRecs.filter(r => Number(r.score) < SCORE_THRESHOLD).length,
          rejected: allRecs.filter(r => rejectedIds.has(r.media_id)).length,
          already_boosted: allRecs.filter(r => boostedIds.has(r.media_id)).length,
          too_old: allRecs.filter(r => {
            const d = (now - new Date(r.published_at).getTime()) / (24 * 60 * 60 * 1000);
            return d > MAX_REEL_AGE_DAYS;
          }).length,
          in_cooldown: allRecs.filter(r => recentlyAlertedIds.has(r.media_id)).length,
        },
      });
    }

    // 7. Helper — topical match (same logic as frontend)
    const STOPWORDS = new Set(["para","con","por","del","los","las","una","uno","esta","este","pero","como","sin","hay","son","hace","que","todo","todos","toda","todas","muy","mas","sus","soy","nos","les","cual","dos","tres","nuestro","nuestra","sobre","entre","antes","despues","tambien","cuando","donde","porque","desde","hasta","cada","mientras","quien","cuanto","cuantos","cuantas","aqui","alli","ahora","sera","seran","fueron","estos","estas","aunque","mismo","misma","otros","otras","algunos","algunas","gran","grandes","nuevo","nueva","mayor","menor","puede","pueden","debe","debemos","hacer","hacia","segun","salvo","excepto","oeste","norte","este","sur","casi","solo","solos","siempre","nunca","jamas","ultimo","ultima"]);
    
    const getSignalWords = (text) => (text || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w));

    const bestMatch = (caption) => {
      const captionWords = new Set(getSignalWords(caption));
      if (!captionWords.size) return null;
      let best = null;
      let bestScore = 0;
      for (const p of posts) {
        const words = getSignalWords(p.title);
        let matches = 0;
        for (const w of words) if (captionWords.has(w)) matches++;
        if (matches > bestScore) { bestScore = matches; best = p; }
      }
      return bestScore > 0 ? best : null;
    };

    // 8. Build email HTML — 10AMPRO dark terminal aesthetic, matching churn-notify
    let emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #0A0A0F; color: #E4E4E7; padding: 32px; border-radius: 12px;">
        <h1 style="font-size: 24px; margin-bottom: 4px;">
          <span style="color: #D4A843;">IG BOOST</span>
          <span style="color: #22C55E;"> ALERT</span>
        </h1>
        <p style="color: #71717A; font-size: 12px; margin-bottom: 8px;">Oportunidades detectadas — reels ≤30 días con score ≥${SCORE_THRESHOLD}</p>
        <p style="color: #52525B; font-size: 11px; margin-bottom: 24px;">${candidates.length} candidato${candidates.length !== 1 ? "s" : ""} · Check automático Lun/Jue 8 AM</p>
    `;

    for (const c of candidates) {
      const ageDays = Math.floor((now - new Date(c.published_at).getTime()) / (24 * 60 * 60 * 1000));
      const match = bestMatch(c.caption);
      const caption = (c.caption || "").split("\n")[0].slice(0, 80);
      
      // Risk flag: contains political keywords
      const politicalKeywords = /trump|petro|milei|maduro|biden|harris|elecci|gobierno|presidente|partido|izquierda|derecha|política|político/i;
      const isPoliticalRisk = politicalKeywords.test(c.caption || "");

      emailHtml += `
        <div style="background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.2); border-radius: 10px; padding: 18px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 10px; color: #71717A; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
              RANK #${c.rank} · ${ageDays}d de antigüedad
            </div>
            <div style="background: rgba(212,168,67,0.15); color: #D4A843; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700;">
              Score ${Number(c.score).toFixed(1)}
            </div>
          </div>
          
          <div style="font-size: 15px; font-weight: 600; color: #E4E4E7; margin-bottom: 10px; line-height: 1.3;">
            ${caption}${(c.caption || "").length > 80 ? "…" : ""}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
            <tr>
              <td style="padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; color: #A1A1AA;">
                <div style="font-size: 9px; color: #71717A; text-transform: uppercase;">Views</div>
                <div style="font-size: 14px; font-weight: 700; color: #E4E4E7;">${Number(c.views).toLocaleString()}</div>
              </td>
              <td style="padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; color: #A1A1AA;">
                <div style="font-size: 9px; color: #71717A; text-transform: uppercase;">ER</div>
                <div style="font-size: 14px; font-weight: 700; color: #22C55E;">${Number(c.engagement_rate).toFixed(1)}%</div>
              </td>
              <td style="padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; color: #A1A1AA;">
                <div style="font-size: 9px; color: #71717A; text-transform: uppercase;">Saves/1K</div>
                <div style="font-size: 14px; font-weight: 700; color: #818CF8;">${Number(c.saves_per_1k).toFixed(1)}</div>
              </td>
              <td style="padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; color: #A1A1AA;">
                <div style="font-size: 9px; color: #71717A; text-transform: uppercase;">Shares</div>
                <div style="font-size: 14px; font-weight: 700; color: #A1A1AA;">${Number(c.shares).toLocaleString()}</div>
              </td>
            </tr>
          </table>

          <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #A1A1AA; margin-bottom: 10px;">
            <span style="color: #22C55E; font-weight: 600;">↳</span> ${c.reasoning}
          </div>

          ${match ? `
            <div style="font-size: 11px; color: #A1A1AA; margin-bottom: 10px;">
              <span style="color: #71717A;">🎯 Landing sugerida:</span> <a href="${match.url}" style="color: #818CF8; text-decoration: none;">${match.title.slice(0, 60)}${match.title.length > 60 ? "…" : ""}</a>
            </div>
          ` : `
            <div style="font-size: 11px; color: #D4A843; margin-bottom: 10px;">
              ⚠️ Sin post topical match — considerá escribir deep dive o usar /subscribe
            </div>
          `}

          ${isPoliticalRisk ? `
            <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #EF4444; margin-bottom: 10px;">
              ⚠️ <strong>RIESGO:</strong> Contiene palabras políticas — Meta puede rechazar el boost (como pasó con Trump/Madmen)
            </div>
          ` : ""}

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <a href="${c.permalink}" style="flex: 1; text-align: center; background: rgba(225,48,108,0.1); border: 1px solid rgba(225,48,108,0.25); color: #E1306C; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">
              Ver reel ↗
            </a>
            <a href="https://growth.10am.pro" style="flex: 2; text-align: center; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #22C55E; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;">
              Configurar boost →
            </a>
          </div>
        </div>
      `;
    }

    emailHtml += `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="color: #52525B; font-size: 11px; line-height: 1.6;">
            Filtro: score ≥${SCORE_THRESHOLD} · antigüedad ≤${MAX_REEL_AGE_DAYS}d · no boosteado · no alertado en últimos ${COOLDOWN_DAYS}d<br/>
            <a href="https://growth.10am.pro" style="color: #22C55E;">Abrir IG Boost Dashboard →</a>
          </p>
        </div>
      </div>
    `;

    const subject = candidates.length === 1
      ? `🚀 Boost alert: "${(candidates[0].caption || "").split("\n")[0].slice(0, 50)}"`
      : `🚀 Boost alert: ${candidates.length} oportunidades detectadas`;

    // 9. Send email via Resend
    if (!RESEND_KEY) {
      return res.status(200).json({
        ok: true,
        message: "RESEND_API_KEY not set — preview only",
        candidates: candidates.length,
        subject,
      });
    }

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "10AMPRO IG Boost <onboarding@resend.dev>",
        to: ["info@10am.pro"],
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResp.ok) {
      const err = await emailResp.text();
      return res.status(500).json({ error: "Resend failed", detail: err });
    }

    // 10. Record which reels were alerted about (for cooldown)
    const alertRows = candidates.map(c => ({
      media_id: c.media_id,
      score: Number(c.score),
      reel_age_days: Math.floor((now - new Date(c.published_at).getTime()) / (24 * 60 * 60 * 1000)),
      notes: `Alert sent · rank #${c.rank} · caption: ${(c.caption || "").slice(0, 100)}`,
    }));

    await fetch(`${SUPABASE_URL}/rest/v1/ig_boost_alerts_sent`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(alertRows),
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      message: "Email sent",
      candidates_count: candidates.length,
      candidates: candidates.map(c => ({
        rank: c.rank,
        caption: (c.caption || "").split("\n")[0].slice(0, 80),
        score: Number(c.score).toFixed(1),
      })),
    });
  } catch (e) {
    console.error("Cron error:", e);
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  maxDuration: 60,
};
