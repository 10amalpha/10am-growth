"use client";
import { useState, useEffect, useMemo } from "react";

// ── helpers ──
const fmt = n => n == null ? "—" : Number(n).toLocaleString();
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" }) : "—";
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// Extract a short slug from caption for UTM campaign (e.g. "tributacion")
const slugFromCaption = (caption) => {
  if (!caption) return "clip";
  const clean = caption.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
  const stopwords = ["que", "para", "con", "por", "del", "los", "las", "una", "esta", "este", "pero", "como", "sin", "hay", "son", "hace"];
  const words = clean.split(/\s+/).filter(w => w.length >= 4 && !stopwords.includes(w)).slice(0, 2);
  return words.join("_") || "clip";
};

const monthTag = () => {
  const d = new Date();
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return months[d.getMonth()] + String(d.getFullYear()).slice(-2);
};

// Budget suggestion: scale to baseline views (higher baseline = boost can go bigger)
const suggestBudget = (views) => {
  if (views >= 5000) return 400;
  if (views >= 2500) return 300;
  if (views >= 1000) return 200;
  return 150;
};

// Build final URL with UTMs
const buildFinalUrl = (base, campaign) => {
  if (!base || !campaign) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=ig&utm_medium=boost&utm_campaign=${campaign}`;
};

// Status badge color
const statusColor = s => ({
  active: "#22C55E",
  paused: "#D4A843",
  completed: "#71717A",
}[s] || "#71717A");

const useIsMobile = () => {
  const [m, setM] = useState(false);
  useEffect(() => {
    const c = () => setM(window.innerWidth < 768);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return m;
};

// Topical matching — scores how well a post title matches a clip caption
const STOPWORDS = new Set(["para","con","por","del","los","las","una","uno","esta","este","pero","como","sin","hay","son","hace","que","todo","todos","toda","todas","muy","mas","sus","soy","nos","les","cual","dos","tres","nuestro","nuestra","sobre","entre","antes","despues","tambien","cuando","donde","porque","desde","hasta","cada","mientras","quien","cuanto","cuantos","cuantas","aqui","alli","ahora","sera","seran","fueron","estos","estas","aunque","mismo","misma","otros","otras","algunos","algunas","gran","grandes","nuevo","nueva","mayor","menor","puede","pueden","debe","debemos","hacer","hacia","segun","salvo","excepto","oeste","norte","este","sur","casi","solo","solos","siempre","nunca","jamas","ultimo","ultima"]);

const getSignalWords = (text) => {
  return (text || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
};

const topicalScore = (clipCaption, postTitle) => {
  const captionWords = new Set(getSignalWords(clipCaption));
  if (captionWords.size === 0) return 0;
  const titleWords = getSignalWords(postTitle);
  let matches = 0;
  for (const w of titleWords) {
    if (captionWords.has(w)) matches++;
  }
  return matches;
};

// Given a clip + all posts, returns posts sorted by topical relevance (specials pinned at top)
const sortPostsForClip = (clipCaption, posts) => {
  return posts
    .map(p => {
      const isSpecial = p.url === "https://10am.pro" || p.url === "https://10am.pro/subscribe";
      return { ...p, _score: isSpecial ? null : topicalScore(clipCaption, p.title), _isSpecial: isSpecial };
    })
    .sort((a, b) => {
      // Specials pinned to top in their original order (subscribe before homepage)
      if (a._isSpecial && !b._isSpecial) return -1;
      if (!a._isSpecial && b._isSpecial) return 1;
      if (a._isSpecial && b._isSpecial) return 0;
      // Non-specials: by topical score desc, then by recency
      if (b._score !== a._score) return b._score - a._score;
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    });
};

// ── component ──
export default function IgBoostTab() {
  const mob = useIsMobile();
  const [recs, setRecs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [computedAt, setComputedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Per-clip form state
  const [forms, setForms] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [feedback, setFeedback] = useState({});
  
  // Tracking — current live metrics for each boosted media (keyed by media_id)
  const [liveMetrics, setLiveMetrics] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

  // Fetch tracking + live metrics for all boosted media
  const loadTracking = async () => {
    const t = await fetch("/api/ig-boost-tracking").then(r => r.json()).catch(() => ({}));
    const rows = t.tracking || [];
    setTracking(rows);
    
    // Batch-fetch current metrics for each tracked media
    if (rows.length > 0) {
      const ids = [...new Set(rows.map(r => r.media_id))].join(",");
      try {
        const m = await fetch(`/api/ig-boost-metrics?ids=${ids}`).then(r => r.json());
        setLiveMetrics(m.metrics || {});
      } catch (e) { /* silent fail */ }
    }
  };

  // Patch a tracking row field (emails_attributed, status, notes, etc.)
  const patchTracking = async (id, field, value) => {
    try {
      const resp = await fetch("/api/ig-boost-tracking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!resp.ok) throw new Error("Update failed");
      await loadTracking();
      setEditingCell(null);
    } catch (e) { console.error(e); }
  };

  // Reusable fetch — called on mount AND from refresh button
  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    const [r, p, t] = await Promise.all([
      fetch("/api/ig-boost-live").then(r => r.json()).catch(e => ({ error: e.message })),
      fetch("/api/substack-posts").then(r => r.json()).catch(e => ({ error: e.message })),
      fetch("/api/ig-boost-tracking").then(r => r.json()).catch(e => ({ error: e.message })),
    ]);
    if (r.error) setErr(r.error);
    setRecs(r.recommendations || []);
    setComputedAt(r.computed_at);
    const combined = [...(p.specials || []), ...(p.posts || [])];
    setPosts(combined);
    setTracking(t.tracking || []);
    
    // Also fetch live metrics for tracked media (for delta display)
    const trackedIds = [...new Set((t.tracking || []).map(r => r.media_id))];
    if (trackedIds.length > 0) {
      fetch(`/api/ig-boost-metrics?ids=${trackedIds.join(",")}`)
        .then(r => r.json())
        .then(m => setLiveMetrics(m.metrics || {}))
        .catch(() => {});
    }
    
    // Initialize form state — pre-select best topical match per clip (not homepage)
    const initial = {};
    (r.recommendations || []).forEach(c => {
      const sorted = sortPostsForClip(c.caption, combined);
      const bestMatch = sorted.find(p => !p._isSpecial && p._score > 0);
      const defaultLanding = bestMatch ? bestMatch.url : "https://10am.pro/subscribe";
      initial[c.media_id] = {
        landing: defaultLanding,
        budget: suggestBudget(c.views),
        campaign: `${slugFromCaption(c.caption)}_${monthTag()}`,
        days: 7,
      };
    });
    setForms(initial);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const updateForm = (mediaId, field, value) => {
    setForms(prev => ({ ...prev, [mediaId]: { ...prev[mediaId], [field]: value } }));
  };

  const markBoosted = async (clip) => {
    const f = forms[clip.media_id];
    if (!f?.landing || !f?.campaign) {
      setFeedback(prev => ({ ...prev, [clip.media_id]: { type: "err", msg: "Faltan campos" } }));
      return;
    }
    setSubmitting(prev => ({ ...prev, [clip.media_id]: true }));
    try {
      const resp = await fetch("/api/ig-boost-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: clip.media_id,
          permalink: clip.permalink,
          caption: clip.caption,
          landing_url: f.landing,
          utm_campaign: f.campaign,
          budget_usd: f.budget,
          duration_days: f.days,
          status: "active",
          // Baseline snapshot at boost time
          baseline_views: clip.views,
          baseline_reach: clip.reach,
          baseline_likes: clip.likes,
          baseline_comments: clip.comments,
          baseline_shares: clip.shares,
          baseline_saves: clip.saves,
          baseline_follows: clip.follows,
          baseline_profile_visits: clip.profile_visits,
          baseline_engagement_rate: clip.engagement_rate,
          baseline_follows_per_1k: clip.follows_per_1k,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Insert failed");
      setFeedback(prev => ({ ...prev, [clip.media_id]: { type: "ok", msg: "✓ Boost registrado con baseline" } }));
      // Refresh tracking + current metrics
      await loadTracking();
    } catch (e) {
      setFeedback(prev => ({ ...prev, [clip.media_id]: { type: "err", msg: e.message } }));
    } finally {
      setSubmitting(prev => ({ ...prev, [clip.media_id]: false }));
    }
  };

  const copyUrl = (text, mediaId) => {
    navigator.clipboard?.writeText(text);
    setFeedback(prev => ({ ...prev, [mediaId + "_url"]: { type: "ok", msg: "✓ URL copiada" } }));
    setTimeout(() => setFeedback(prev => ({ ...prev, [mediaId + "_url"]: null })), 1800);
  };

  // Styles
  const cardStyle = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: mob ? 14 : 18, marginBottom: 14 };
  const inputStyle = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px", fontSize: 11, color: "#E4E4E7", fontFamily: "'JetBrains Mono', monospace", width: "100%", outline: "none" };
  const labelStyle = { fontSize: 9, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "block" };
  const metricStyle = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px", textAlign: "center" };
  const metricLabel = { fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 };
  const metricValue = { fontSize: mob ? 12 : 14, fontWeight: 700, fontFamily: "'Space Grotesk'" };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#71717A", fontSize: 13 }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600, color: "#E4E4E7", marginBottom: 6 }}>Consultando Instagram en vivo...</div>
        <div style={{ fontSize: 11, color: "#71717A" }}>
          Fetcheando reels, insights (views, follows, saves, profile visits) y scoreando candidatos.<br/>
          Esto toma ~30 segundos. Los datos son siempre frescos, no hay cache.
        </div>
      </div>
    );
  }

  if (err || !recs.length) {
    return (
      <div style={{ padding: 30, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#E4E4E7", marginBottom: 10 }}>Sin recomendaciones</div>
        <div style={{ fontSize: 12, color: "#A1A1AA", lineHeight: 1.6 }}>
          {err ? (
            <>Error al consultar Instagram API: <span style={{ color: "#EF4444" }}>{err}</span></>
          ) : (
            <>No se encontraron clips con métricas válidas en las últimas 4 semanas. Podés verificar la respuesta cruda en <a href="/api/ig-boost-live" target="_blank" style={{ color: "#22C55E" }}>/api/ig-boost-live</a>.</>
          )}
        </div>
      </div>
    );
  }

  const top3 = recs.slice(0, 3);
  const rest = recs.slice(3);

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: mob ? 16 : 18, fontWeight: 700, color: "#E4E4E7", fontFamily: "'Space Grotesk'" }}>
              🚀 IG Boost Recommendations
            </div>
            <div style={{ fontSize: 11, color: "#71717A", marginTop: 2 }}>
              Top clips ≤60s de las últimas 4 semanas · Priorizados por conversión a email
            </div>
          </div>
          {computedAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 10, color: "#52525B", fontFamily: "'JetBrains Mono'" }}>
                Live fetch: {fmtDateTime(computedAt)}
              </div>
              <button
                onClick={loadAll}
                disabled={loading}
                title="Re-fetch en vivo desde Meta + Substack RSS"
                style={{
                  background: loading ? "rgba(255,255,255,0.02)" : "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#22C55E", padding: "4px 10px", borderRadius: 6,
                  fontSize: 10, cursor: loading ? "default" : "pointer",
                  fontFamily: "inherit", fontWeight: 600,
                }}
              >
                {loading ? "..." : "🔄 Refetch"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOP 3 CARDS */}
      {top3.map(clip => {
        const f = forms[clip.media_id] || {};
        const finalUrl = buildFinalUrl(f.landing, f.campaign);
        const fb = feedback[clip.media_id];
        const urlFb = feedback[clip.media_id + "_url"];
        const isFirst = clip.rank === 1;

        return (
          <div key={clip.media_id} style={{ ...cardStyle, borderColor: isFirst ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.05)", background: isFirst ? "rgba(34,197,94,0.03)" : cardStyle.background }}>
            {/* CLIP HEADER */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: mob ? "wrap" : "nowrap" }}>
              <div style={{ 
                background: isFirst ? "#22C55E" : "#3F3F46",
                color: isFirst ? "#000" : "#A1A1AA",
                minWidth: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk'"
              }}>
                #{clip.rank}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E4E4E7", marginBottom: 4, lineHeight: 1.35 }}>
                  {clip.caption?.split("\n")[0] || "—"}
                </div>
                <div style={{ fontSize: 10, color: "#71717A", fontFamily: "'JetBrains Mono'", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>⏱ {clip.duration_sec ? `${Math.round(clip.duration_sec)}s` : "?"}</span>
                  <span>📅 {fmtDate(clip.published_at)}</span>
                  <a href={clip.permalink} target="_blank" rel="noopener" style={{ color: "#E1306C", textDecoration: "none" }}>↗ ver reel</a>
                </div>
              </div>
              <div style={{
                background: "rgba(212,168,67,0.1)", color: "#D4A843",
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono'"
              }}>
                Score {Number(clip.score).toFixed(1)}
              </div>
            </div>

            {/* METRICS */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 6, marginBottom: 12 }}>
              <div style={metricStyle}>
                <div style={metricLabel}>Views</div>
                <div style={{ ...metricValue, color: "#E4E4E7" }}>{fmt(clip.views)}</div>
              </div>
              <div style={metricStyle}>
                <div style={metricLabel}>ER</div>
                <div style={{ ...metricValue, color: "#22C55E" }}>{Number(clip.engagement_rate).toFixed(1)}%</div>
              </div>
              <div style={metricStyle}>
                <div style={metricLabel}>Foll/1K</div>
                <div style={{ ...metricValue, color: "#D4A843" }}>{Number(clip.follows_per_1k).toFixed(1)}</div>
              </div>
              <div style={metricStyle}>
                <div style={metricLabel}>Saves/1K</div>
                <div style={{ ...metricValue, color: "#818CF8" }}>{Number(clip.saves_per_1k).toFixed(1)}</div>
              </div>
              <div style={metricStyle}>
                <div style={metricLabel}>Shares</div>
                <div style={{ ...metricValue, color: "#A1A1AA" }}>{fmt(clip.shares)}</div>
              </div>
              <div style={metricStyle}>
                <div style={metricLabel}>Saves</div>
                <div style={{ ...metricValue, color: "#A1A1AA" }}>{fmt(clip.saves)}</div>
              </div>
            </div>

            {/* REASONING */}
            <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 11, color: "#A1A1AA" }}>
              <span style={{ color: "#22C55E", fontWeight: 600, marginRight: 6 }}>↳</span>{clip.reasoning}
            </div>

            {/* BOOST CONFIG */}
            <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: mob ? 12 : 14 }}>
              <div style={{ fontSize: 10, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>
                ⚡ Configurar Boost
              </div>

              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Landing</label>
                  {(() => {
                    const sortedPosts = sortPostsForClip(clip.caption, posts);
                    const topMatch = sortedPosts.find(p => !p._isSpecial && p._score > 0);
                    const selectedPost = sortedPosts.find(p => p.url === f.landing);
                    const isHomepage = f.landing === "https://10am.pro";
                    return (
                      <>
                        <select value={f.landing} onChange={e => updateForm(clip.media_id, "landing", e.target.value)} style={{ ...inputStyle, borderColor: isHomepage ? "rgba(239,68,68,0.3)" : inputStyle.border }}>
                          {sortedPosts.map((p, i) => {
                            const prefix = p._isSpecial ? "" : (topMatch && p.url === topMatch.url ? "🎯 " : p._score > 0 ? "· " : "  ");
                            const suffix = !p._isSpecial && p._score > 0 ? ` (${p._score} match${p._score > 1 ? "es" : ""})` : "";
                            const label = `${prefix}${p.title}${suffix}`;
                            return <option key={i} value={p.url}>{label.length > 80 ? label.slice(0, 80) + "…" : label}</option>;
                          })}
                        </select>
                        {isHomepage && (
                          <div style={{ fontSize: 9, color: "#EF4444", marginTop: 4, lineHeight: 1.4 }}>
                            ⚠️ Homepage convierte a 1.3% (6x peor que post específico). Preferí un post del tema.
                          </div>
                        )}
                        {!isHomepage && topMatch && selectedPost && !selectedPost._isSpecial && selectedPost.url !== topMatch.url && (
                          <div style={{ fontSize: 9, color: "#D4A843", marginTop: 4, lineHeight: 1.4 }}>
                            💡 Mejor match topical: "{topMatch.title.slice(0, 50)}{topMatch.title.length > 50 ? "…" : ""}"
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label style={labelStyle}>Presupuesto USD</label>
                  <input type="number" value={f.budget} onChange={e => updateForm(clip.media_id, "budget", Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Días</label>
                  <input type="number" value={f.days} onChange={e => updateForm(clip.media_id, "days", Number(e.target.value))} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>UTM Campaign</label>
                <input type="text" value={f.campaign} onChange={e => updateForm(clip.media_id, "campaign", e.target.value)} style={inputStyle} />
              </div>

              {/* FINAL URL TO COPY */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>URL final para IG Boost</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={finalUrl} style={{ ...inputStyle, background: "rgba(34,197,94,0.04)", color: "#22C55E", fontSize: 10 }} />
                  <button onClick={() => copyUrl(finalUrl, clip.media_id)} style={{
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E",
                    padding: "7px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap"
                  }}>
                    {urlFb?.msg || "📋 Copiar"}
                  </button>
                </div>
              </div>

              {/* ACTION */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => markBoosted(clip)}
                  disabled={submitting[clip.media_id]}
                  style={{
                    background: submitting[clip.media_id] ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.3)", color: "#22C55E",
                    padding: "9px 22px", borderRadius: 6, fontSize: 12, cursor: submitting[clip.media_id] ? "default" : "pointer",
                    fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  {submitting[clip.media_id] ? "Guardando..." : "✓ Marcar como boosteado"}
                </button>
                {fb && <span style={{ fontSize: 11, color: fb.type === "ok" ? "#22C55E" : "#EF4444" }}>{fb.msg}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {/* REST — compact list */}
      {rest.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>
            Otros candidatos ({rest.length})
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["#", "Caption", "Dur", "Views", "ER%", "F/1K", "S/1K", "Score", ""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#71717A", borderBottom: "1px solid rgba(255,255,255,0.04)", fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map(c => (
                    <tr key={c.media_id}>
                      <td style={{ padding: "7px 10px", color: "#52525B" }}>{c.rank}</td>
                      <td style={{ padding: "7px 10px", color: "#A1A1AA", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.caption?.split("\n")[0]}</td>
                      <td style={{ padding: "7px 10px", color: "#71717A" }}>{c.duration_sec ? `${Math.round(c.duration_sec)}s` : "—"}</td>
                      <td style={{ padding: "7px 10px", color: "#E4E4E7" }}>{fmt(c.views)}</td>
                      <td style={{ padding: "7px 10px", color: "#22C55E" }}>{Number(c.engagement_rate).toFixed(1)}</td>
                      <td style={{ padding: "7px 10px", color: "#D4A843" }}>{Number(c.follows_per_1k).toFixed(1)}</td>
                      <td style={{ padding: "7px 10px", color: "#818CF8" }}>{Number(c.saves_per_1k).toFixed(1)}</td>
                      <td style={{ padding: "7px 10px", color: "#D4A843", fontWeight: 600 }}>{Number(c.score).toFixed(1)}</td>
                      <td style={{ padding: "7px 10px" }}><a href={c.permalink} target="_blank" rel="noopener" style={{ color: "#E1306C", textDecoration: "none", fontSize: 10 }}>↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING HISTORY */}
      {tracking.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 10, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              🔄 Historial de boosts · {tracking.length}
            </div>
            <div style={{ fontSize: 9, color: "#52525B" }}>
              Métricas actuales vía Meta API · Δ vs baseline capturado al momento del boost
            </div>
          </div>
          
          {tracking.map(t => {
            const live = liveMetrics[t.media_id] || {};
            const deltaViews = live.views != null && t.baseline_views != null ? live.views - t.baseline_views : null;
            const deltaFollows = live.follows != null && t.baseline_follows != null ? live.follows - t.baseline_follows : null;
            const deltaSaves = live.saves != null && t.baseline_saves != null ? live.saves - t.baseline_saves : null;
            const deltaProfile = live.profile_visits != null && t.baseline_profile_visits != null ? live.profile_visits - t.baseline_profile_visits : null;
            
            const emails = t.emails_attributed;
            const paidSubs = t.paid_subs_attributed;
            const budget = Number(t.budget_usd) || 0;
            const costPerEmail = emails > 0 ? (budget / emails).toFixed(2) : null;
            const costPerPaid = paidSubs > 0 ? (budget / paidSubs).toFixed(2) : null;
            
            const renderDelta = (delta, suffix = "") => {
              if (delta == null) return <span style={{ color: "#3F3F46" }}>—</span>;
              if (delta === 0) return <span style={{ color: "#52525B" }}>+0{suffix}</span>;
              const color = delta > 0 ? "#22C55E" : "#EF4444";
              const sign = delta > 0 ? "+" : "";
              return <span style={{ color, fontWeight: 600 }}>{sign}{fmt(delta)}{suffix}</span>;
            };
            
            const editField = (field, currentVal, placeholder = "—") => {
              const isEditing = editingCell?.id === t.id && editingCell?.field === field;
              if (isEditing) {
                return (
                  <input
                    type="text"
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => patchTracking(t.id, field, editValue === "" ? null : (field === "status" || field === "notes" ? editValue : Number(editValue)))}
                    onKeyDown={e => {
                      if (e.key === "Enter") e.target.blur();
                      if (e.key === "Escape") setEditingCell(null);
                    }}
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 4, padding: "3px 6px", fontSize: 11, color: "#22C55E", fontFamily: "'JetBrains Mono'", width: 70 }}
                  />
                );
              }
              return (
                <span onClick={() => { setEditingCell({ id: t.id, field }); setEditValue(currentVal ?? ""); }} style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.1)" }} title="Click para editar">
                  {currentVal != null && currentVal !== "" ? currentVal : placeholder}
                </span>
              );
            };

            return (
              <div key={t.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: mob ? 12 : 14, marginBottom: 10 }}>
                {/* Row header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E4E4E7", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.caption?.split("\n")[0] || "—"}
                    </div>
                    <div style={{ fontSize: 9, color: "#71717A", fontFamily: "'JetBrains Mono'", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>📅 {fmtDate(t.boosted_at)}</span>
                      <span style={{ color: "#D4A843" }}>UTM: {t.utm_campaign}</span>
                      <a href={t.landing_url} target="_blank" rel="noopener" style={{ color: "#818CF8", textDecoration: "none" }}>
                        → {(t.landing_url || "").replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                      {t.permalink && <a href={t.permalink} target="_blank" rel="noopener" style={{ color: "#E1306C", textDecoration: "none" }}>↗ reel</a>}
                    </div>
                  </div>
                  <span
                    onClick={() => { setEditingCell({ id: t.id, field: "status" }); setEditValue(t.status || ""); }}
                    style={{ background: `${statusColor(t.status)}15`, color: statusColor(t.status), padding: "3px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" }}
                    title="Click para editar status"
                  >
                    {editingCell?.id === t.id && editingCell?.field === "status" ? editField("status", t.status) : (t.status || "—")}
                  </span>
                </div>

                {/* Growth grid */}
                <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Views</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "'JetBrains Mono'" }}>
                      {fmt(t.baseline_views)} → <span style={{ color: "#E4E4E7", fontWeight: 600 }}>{live.views != null ? fmt(live.views) : "—"}</span>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{renderDelta(deltaViews)}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Follows</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "'JetBrains Mono'" }}>
                      {fmt(t.baseline_follows)} → <span style={{ color: "#D4A843", fontWeight: 600 }}>{live.follows != null ? fmt(live.follows) : "—"}</span>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{renderDelta(deltaFollows)}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Saves</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "'JetBrains Mono'" }}>
                      {fmt(t.baseline_saves)} → <span style={{ color: "#818CF8", fontWeight: 600 }}>{live.saves != null ? fmt(live.saves) : "—"}</span>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{renderDelta(deltaSaves)}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Profile visits</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "'JetBrains Mono'" }}>
                      {fmt(t.baseline_profile_visits)} → <span style={{ color: "#22C55E", fontWeight: 600 }}>{live.profile_visits != null ? fmt(live.profile_visits) : "—"}</span>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{renderDelta(deltaProfile)}</div>
                  </div>
                </div>

                {/* Attribution row */}
                <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 6, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.08)", borderRadius: 6, padding: "10px 12px" }}>
                  <div>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Budget</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", fontFamily: "'Space Grotesk'" }}>${fmt(budget)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Emails captados</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: emails ? "#22C55E" : "#52525B", fontFamily: "'Space Grotesk'" }}>
                      {editField("emails_attributed", t.emails_attributed)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>$/email</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: costPerEmail ? "#D4A843" : "#3F3F46", fontFamily: "'Space Grotesk'" }}>
                      {costPerEmail ? `$${costPerEmail}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Paid subs</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: paidSubs ? "#22C55E" : "#52525B", fontFamily: "'Space Grotesk'" }}>
                      {editField("paid_subs_attributed", t.paid_subs_attributed)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>$/paid</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: costPerPaid ? "#D4A843" : "#3F3F46", fontFamily: "'Space Grotesk'" }}>
                      {costPerPaid ? `$${costPerPaid}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div style={{ marginTop: 10, fontSize: 10, color: "#52525B", lineHeight: 1.5 }}>
            💡 Emails y paid subs se llenan manualmente (click el valor para editar) cruzando con el Substack sources CSV filtrando por utm_campaign. Próximamente: upload CSV → auto-match.
          </div>
        </div>
      )}
    </div>
  );
}
