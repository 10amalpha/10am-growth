"use client";
import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Bar, ComposedChart, Cell, BarChart
} from "recharts";

/* ── Revenue Data (Jan 2025 → Jan 2026) — Gumroad renamed to Gumroad + Substack ── */
const REVENUE_RAW = [
  { month: "Jan 25", youtube: 4954, gumroad_substack: 210, sponsors: 0, spotify: 48, events: 0, total: 5212, expenses: 2959 },
  { month: "Feb 25", youtube: 5411, gumroad_substack: 824, sponsors: 0, spotify: 0, events: 0, total: 6236, expenses: 3474 },
  { month: "Mar 25", youtube: 5546, gumroad_substack: 1462, sponsors: 0, spotify: 0, events: 0, total: 7008, expenses: 3669 },
  { month: "Apr 25", youtube: 5130, gumroad_substack: 1392, sponsors: 1191, spotify: 0, events: 0, total: 8522, expenses: 5636 },
  { month: "May 25", youtube: 4789, gumroad_substack: 1948, sponsors: 0, spotify: 317, events: 810, total: 7054, expenses: 4723 },
  { month: "Jun 25", youtube: 4813, gumroad_substack: 2409, sponsors: 0, spotify: 93, events: 0, total: 7315, expenses: 4098 },
  { month: "Jul 25", youtube: 4506, gumroad_substack: 2079, sponsors: 0, spotify: 66, events: 0, total: 6652, expenses: 3922 },
  { month: "Aug 25", youtube: 4819, gumroad_substack: 2446, sponsors: 0, spotify: 73, events: 0, total: 7338, expenses: 4213 },
  { month: "Sep 25", youtube: 4546, gumroad_substack: 5357, sponsors: 0, spotify: 53, events: 0, total: 9956, expenses: 5585 },
  { month: "Oct 25", youtube: 4713, gumroad_substack: 3185, sponsors: 0, spotify: 63, events: 0, total: 7962, expenses: 4548 },
  { month: "Nov 25", youtube: 4932, gumroad_substack: 3351, sponsors: 2132, spotify: 75, events: 0, total: 10489, expenses: 5951 },
  { month: "Dec 25", youtube: 4200, gumroad_substack: 5072, sponsors: 1061, spotify: 88, events: 0, total: 10421, expenses: 5597 },
  { month: "Jan 26", youtube: 5395, gumroad_substack: 7400, sponsors: 0, spotify: 53, events: 0, total: 12848, expenses: 7021 },
];

/* ── Channels: Real scraped data where available ── */
const CHANNELS = [
  { key: "substack", name: "Substack", icon: "✉️", color: "#FF6719", baseline: 3497, auto: false, note: "Feb 16, 2026" },
  { key: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000", baseline: 23300, auto: true, note: "Scraped Feb 16, 2026" },
  { key: "tiktok", name: "TikTok", icon: "♪", color: "#00F2EA", baseline: 48800, auto: false, note: "Scraped Feb 16, 2026" },
  { key: "instagram", name: "Instagram", icon: "📷", color: "#E1306C", baseline: 16200, auto: false, note: "Feb 16, 2026" },
  { key: "x", name: "X / Twitter", icon: "𝕏", color: "#A1A1AA", baseline: 5419, auto: false, note: "Feb 16, 2026" },
  { key: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", baseline: 1250, auto: false, note: "Feb 16, 2026" },
  { key: "spotify", name: "Spotify Pods", icon: "🎵", color: "#1DB954", baseline: 38629, auto: true, note: "Feb 16, 2026" },
  { key: "apple", name: "Apple Pods", icon: "🎧", color: "#A855F7", baseline: null, auto: false, note: "Not shown publicly" },
];

const STREAMS = [
  { key: "youtube", label: "YouTube", color: "#FF0000" },
  { key: "gumroad_substack", label: "Gumroad + Substack", color: "#FF6719" },
  { key: "sponsors", label: "Sponsors", color: "#D4A843" },
  { key: "spotify", label: "Spotify", color: "#1DB954" },
  { key: "events", label: "Events", color: "#818CF8" },
];

function fmt(n) {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
  return "$" + n;
}
function fmtK(n) {
  if (!n) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}
const pct = (a, b) => b ? (((a - b) / b) * 100).toFixed(1) : "—";

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,10,15,0.96)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
      <p style={{ color: "#22C55E", marginBottom: 6, fontWeight: 600, fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#A1A1AA", margin: "2px 0" }}>
          {p.name}: <span style={{ fontWeight: 700 }}>{p.dataKey === "margin" ? p.value + "%" : fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function GrowthDashboard() {
  const [view, setView] = useState("followers");

  const latest = REVENUE_RAW[REVENUE_RAW.length - 1];
  const first = REVENUE_RAW[0];
  const prev = REVENUE_RAW[REVENUE_RAW.length - 2];
  const totalRev = REVENUE_RAW.reduce((s, d) => s + d.total, 0);
  const totalProfit = REVENUE_RAW.reduce((s, d) => s + d.total - d.expenses, 0);

  const profitData = REVENUE_RAW.map(d => ({
    ...d, profit: d.total - d.expenses,
    margin: parseFloat(((d.total - d.expenses) / d.total * 100).toFixed(0)),
  }));

  const knownFollowers = CHANNELS.filter(c => c.baseline).reduce((s, c) => s + c.baseline, 0);
  const knownChannels = CHANNELS.filter(c => c.baseline).length;
  const revPer1K = knownFollowers > 0 ? (latest.total / (knownFollowers / 1000)).toFixed(2) : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#E4E4E7", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(180deg, rgba(15,15,22,1) 0%, #0A0A0F 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="https://10ampro-hub.vercel.app/logo.jpg" alt="10AMPRO" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(212,168,67,0.25)", boxShadow: "0 0 24px rgba(34,197,94,0.08)" }} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
                <span style={{ color: "#D4A843" }}>10</span><span style={{ color: "#22C55E" }}>AM</span><span style={{ color: "#52525B" }}>PRO</span>
              </div>
              <div style={{ fontSize: 9, color: "#3F3F46", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: -1 }}>Growth Intelligence</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="https://10am.substack.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#52525B", textDecoration: "none", borderBottom: "1px dotted #3F3F46" }}>10am.pro</a>
            <a href="https://x.com/holdmybirra" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#52525B", textDecoration: "none", borderBottom: "1px dotted #3F3F46" }}>@holdmybirra</a>
            <span style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", padding: "3px 10px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 40px" }}>

        {/* ── CORE METRIC ── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.04), rgba(212,168,67,0.04))",
          border: "1px solid rgba(34,197,94,0.12)", borderRadius: 12, padding: "20px 24px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
              Core Metric — Revenue per 1,000 Followers ({knownChannels}/8 channels tracked)
            </div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 42, fontWeight: 700, color: "#22C55E" }}>${revPer1K}</div>
            <div style={{ fontSize: 11, color: "#71717A", marginTop: 4 }}>Based on {fmtK(knownFollowers)} tracked followers across {knownChannels} channels</div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Known Audience</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#D4A843", fontFamily: "'Space Grotesk'" }}>{fmtK(knownFollowers)}</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Jan 26 Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#22C55E", fontFamily: "'Space Grotesk'" }}>{fmt(latest.total)}</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Pending</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#F59E0B", fontFamily: "'Space Grotesk'" }}>{CHANNELS.length - knownChannels}</div>
              <div style={{ fontSize: 9, color: "#52525B" }}>channels need input</div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[
            { key: "followers", label: "📈 Follower Baseline" },
            { key: "revenue", label: "💰 Revenue Streams" },
            { key: "profit", label: "📊 Profit & Margin" },
            { key: "model", label: "🎯 Revenue Model" },
          ].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              background: view === t.key ? "rgba(34,197,94,0.1)" : "transparent",
              border: view === t.key ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.04)",
              color: view === t.key ? "#22C55E" : "#52525B",
              padding: "7px 16px", borderRadius: 6, fontSize: 11, cursor: "pointer",
              fontFamily: "inherit", fontWeight: view === t.key ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── FOLLOWER BASELINE ── */}
        {view === "followers" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontSize: 11, color: "#52525B", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              February 2026 Baseline — {knownChannels} of 8 Captured
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
              {CHANNELS.map(ch => (
                <div key={ch.key} style={{
                  background: ch.baseline ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
                  border: ch.baseline ? `1px solid ${ch.color}25` : "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 8, padding: "14px 16px", position: "relative", overflow: "hidden",
                }}>
                  {ch.baseline && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ch.color}80, transparent)` }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{ch.key === "linkedin" ? <span style={{ fontWeight: 800, color: ch.color, fontSize: 13 }}>in</span> : ch.icon}</span>
                    <span style={{ fontSize: 11, color: "#A1A1AA", fontWeight: 500 }}>{ch.name}</span>
                    <span style={{
                      fontSize: 7, marginLeft: "auto", fontWeight: 700, letterSpacing: "0.08em",
                      padding: "1px 5px", borderRadius: 3,
                      color: ch.baseline ? "#22C55E" : ch.auto ? "#818CF8" : "#F59E0B",
                      background: ch.baseline ? "rgba(34,197,94,0.1)" : ch.auto ? "rgba(129,140,248,0.1)" : "rgba(245,158,11,0.1)",
                    }}>{ch.baseline ? "✓ CAPTURED" : ch.auto ? "AUTO-FETCH" : "NEEDS INPUT"}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: ch.baseline ? ch.color : "#3F3F46", fontFamily: "'Space Grotesk'" }}>
                    {ch.baseline ? fmtK(ch.baseline) : "—"}
                  </div>
                  <div style={{ fontSize: 9, color: "#3F3F46", marginTop: 6 }}>{ch.note}</div>
                </div>
              ))}
            </div>

            {/* Pending channels callout */}
            <div style={{
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <span style={{ fontSize: 18, marginTop: 2 }}>⚡</span>
              <div>
                <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600, marginBottom: 6 }}>1 channel pending</div>
                <div style={{ fontSize: 11, color: "#A1A1AA", lineHeight: 1.6 }}>
                  <strong style={{ color: "#E4E4E7" }}>Apple Podcasts:</strong> Apple Podcasts Connect → Show analytics → follower count
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REVENUE STREAMS ── */}
        {view === "revenue" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "20px 16px 10px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#52525B", marginBottom: 14, paddingLeft: 8 }}>Monthly Revenue — Stacked Bars</div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={REVENUE_RAW} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#3F3F46" }} tickLine={false} axisLine={{ stroke: "#1A1A2E" }} />
                <YAxis tick={{ fontSize: 10, fill: "#3F3F46" }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                <Tooltip content={<TT />} />
                <Bar dataKey="youtube" stackId="a" fill="#FF0000" name="YouTube" />
                <Bar dataKey="gumroad_substack" stackId="a" fill="#FF6719" name="Gumroad + Substack" />
                <Bar dataKey="sponsors" stackId="a" fill="#D4A843" name="Sponsors" />
                <Bar dataKey="spotify" stackId="a" fill="#1DB954" name="Spotify" />
                <Bar dataKey="events" stackId="a" fill="#818CF8" name="Events" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 16, padding: "0 8px" }}>
              {STREAMS.map(s => {
                const val = latest[s.key];
                const share = latest.total > 0 ? (val / latest.total * 100).toFixed(0) : 0;
                return (
                  <div key={s.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: 9, color: "#3F3F46" }}>{share}%</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#E4E4E7", fontFamily: "'Space Grotesk'" }}>{fmt(val)}</div>
                    <div style={{ display: "flex", gap: 1, marginTop: 6, height: 16, alignItems: "flex-end" }}>
                      {REVENUE_RAW.map((d, i) => {
                        const max = Math.max(...REVENUE_RAW.map(r => r[s.key]), 1);
                        return <div key={i} style={{ flex: 1, height: Math.max((d[s.key] / max) * 14, 1), borderRadius: 1, background: i === REVENUE_RAW.length - 1 ? s.color : s.color + "40" }} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROFIT ── */}
        {view === "profit" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "20px 16px 10px" }}>
            <div style={{ fontSize: 11, color: "#52525B", marginBottom: 14, paddingLeft: 8 }}>Revenue vs Expenses — Margin %</div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={profitData} margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#3F3F46" }} tickLine={false} axisLine={{ stroke: "#1A1A2E" }} />
                <YAxis yAxisId="money" tick={{ fontSize: 10, fill: "#3F3F46" }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: "#3F3F46" }} tickLine={false} axisLine={false} tickFormatter={v => v + "%"} domain={[0, 100]} />
                <Tooltip content={<TT />} />
                <Bar yAxisId="money" dataKey="total" name="Revenue" radius={[3, 3, 0, 0]}>
                  {profitData.map((_, i) => <Cell key={i} fill={i === profitData.length - 1 ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.2)"} />)}
                </Bar>
                <Bar yAxisId="money" dataKey="expenses" name="Expenses" radius={[3, 3, 0, 0]}>
                  {profitData.map((_, i) => <Cell key={i} fill={i === profitData.length - 1 ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"} />)}
                </Bar>
                <Line yAxisId="pct" type="monotone" dataKey="margin" stroke="#D4A843" strokeWidth={2} dot={{ r: 3, fill: "#D4A843" }} name="Margin %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── REVENUE MODEL ── */}
        {view === "model" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontSize: 11, color: "#52525B", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Revenue Model — What does 1,000 followers produce?
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
              {[
                { target: 15000, label: "$15K/mo" },
                { target: 20000, label: "$20K/mo" },
                { target: 30000, label: "$30K/mo" },
                { target: 50000, label: "$50K/mo" },
              ].map((t, i) => {
                const rate = parseFloat(revPer1K) || 0;
                const needed = rate > 0 ? Math.round((t.target / rate) * 1000) : 0;
                const gap = needed - knownFollowers;
                return (
                  <div key={i} style={{
                    background: i === 0 ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${i === 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)"}`,
                    borderRadius: 8, padding: "16px",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? "#22C55E" : "#D4A843", fontFamily: "'Space Grotesk'", marginBottom: 8 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA", marginBottom: 4 }}>Need: <span style={{ fontWeight: 600, color: "#E4E4E7" }}>{fmtK(needed)}</span> followers</div>
                    <div style={{ fontSize: 11, color: "#A1A1AA" }}>Gap: <span style={{ fontWeight: 600, color: gap > 0 ? "#F59E0B" : "#22C55E" }}>{gap > 0 ? "+" + fmtK(gap) : "✓ Met"}</span></div>
                  </div>
                );
              })}
            </div>

            <div style={{
              background: "rgba(212,168,67,0.04)", border: "1px solid rgba(212,168,67,0.12)",
              borderRadius: 8, padding: "16px 20px",
            }}>
              <div style={{ fontSize: 12, color: "#D4A843", fontWeight: 600, marginBottom: 8 }}>The 10AMPRO Flywheel</div>
              <div style={{ fontSize: 11, color: "#A1A1AA", lineHeight: 1.6 }}>
                TikTok/IG clips → YouTube episodes → Substack deep dives → Gumroad + Substack premium → Sponsors.<br/>
                At current ${revPer1K}/1K rate (partial data — 3 of 8 channels), growing the tracked base from {fmtK(knownFollowers)} will compound through each stage.<br/>
                <span style={{ color: "#F59E0B" }}>⚠ Rate will recalculate once all 8 channels are captured — likely dropping to ~$30-40/1K as Substack adds ~200K+ to the denominator.</span>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 9, color: "#27272A", marginTop: 28 }}>
          <span>✅ TikTok 48.8K · Spotify 38.6K · YT 23.3K · IG 16.2K · X 5.4K · Substack 3.5K · LinkedIn 1.3K</span>
          <span>⏳ Pending: Apple Podcasts</span>
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#1A1A2E", paddingBottom: 20, marginTop: 8 }}>
          10AMPRO — Modelos Mentales para Invertir
        </div>
      </div>
    </div>
  );
}
