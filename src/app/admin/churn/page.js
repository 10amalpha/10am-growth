"use client";
import { useState, useEffect, useMemo } from "react";

const PASS_KEY = "10am_churn_pass";

export default function ChurnPage() {
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("remove");
  const [removed, setRemoved] = useState({});
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [gumroadData, setGumroadData] = useState(null);
  const [gumroadHideDone, setGumroadHideDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  // Persist pass in sessionStorage and auto-fetch on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(PASS_KEY);
    if (saved) {
      setPass(saved);
      setUnlocked(true);
      fetchChurn(saved);
    }
  }, []);

  // Load removed checkmarks from Supabase
  const fetchRemoved = async (p) => {
    try {
      const resp = await fetch(`/api/churn-removed?pass=${encodeURIComponent(p)}`);
      if (resp.ok) {
        const d = await resp.json();
        const map = {};
        (d.removed || []).forEach((r) => { map[r.email] = r.removed_at; });
        setRemoved(map);
      }
    } catch {}
  };

  const toggleRemoved = async (email) => {
    const isDone = !!removed[email];
    // Optimistic update
    const next = { ...removed };
    if (isDone) {
      delete next[email];
    } else {
      next[email] = new Date().toISOString();
    }
    setRemoved(next);
    // Persist to Supabase
    try {
      await fetch(`/api/churn-removed?pass=${encodeURIComponent(pass)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: isDone ? "remove" : "add", pass }),
      });
    } catch {
      // Revert on failure
      setRemoved(removed);
    }
  };

  const fetchGumroad = async (p) => {
    try {
      const resp = await fetch(`/api/churn-removed?table=gumroad&pass=${encodeURIComponent(p)}`);
      if (resp.ok) {
        const d = await resp.json();
        setGumroadData(d);
      }
    } catch {}
  };

  const toggleGumroad = async (email, currentlyDone) => {
    // Optimistic
    if (gumroadData?.entries) {
      const next = gumroadData.entries.map((r) =>
        r.email === email
          ? { ...r, removed_at: currentlyDone ? null : new Date().toISOString() }
          : r
      );
      const pending = next.filter((r) => !r.removed_at).length;
      const done = next.filter((r) => !!r.removed_at).length;
      setGumroadData({ ...gumroadData, entries: next, pending, done });
    }
    try {
      await fetch(`/api/churn-removed?table=gumroad&pass=${encodeURIComponent(pass)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          action: currentlyDone ? "uncheck" : "check",
          pass,
        }),
      });
    } catch {
      fetchGumroad(pass);
    }
  };

  const fetchChurn = async (p) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/churn?pass=${encodeURIComponent(p)}`);
      if (resp.status === 401) {
        setError("Wrong password");
        setUnlocked(false);
        sessionStorage.removeItem(PASS_KEY);
        return;
      }
      if (!resp.ok) {
        const e = await resp.json();
        setError(e.error || "Failed to fetch");
        return;
      }
      const d = await resp.json();
      setData(d);
      setUnlocked(true);
      sessionStorage.setItem(PASS_KEY, p);
      // Load removed state from Supabase
      await fetchRemoved(p);
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchChurn(pass);
  };

  const TABS = [
    { key: "remove", label: "REMOVE", count: data?.summary?.toRemove },
    { key: "active", label: "STILL ACTIVE", count: data?.summary?.stillActive },
    { key: "recent", label: "RECENT", count: data?.summary?.recentCancels },
    { key: "past_due", label: "PAST DUE", count: data?.pastDue?.length },
    { key: "resubbed", label: "RE-SUBBED", count: data?.summary?.resubbed },
    { key: "gumroad", label: "GUMROAD", count: gumroadData?.pending },
  ];

  const currentList = useMemo(() => {
    if (!data) return [];
    let list = [];
    if (tab === "remove") list = data.toRemove || [];
    else if (tab === "active") list = data.stillActive || [];
    else if (tab === "recent") list = data.recentCancels || [];
    else if (tab === "past_due") list = data.pastDue || [];
    else if (tab === "resubbed") list = data.resubbed || [];
    if (sourceFilter !== "all") {
      list = list.filter((s) => (s.source || "gumroad") === sourceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data, tab, search, sourceFilter]);

  const pendingCount = useMemo(() => {
    if (!data?.toRemove) return 0;
    return data.toRemove.filter((s) => !removed[s.email]).length;
  }, [data, removed]);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ── Styles ──
  const s = {
    page: {
      minHeight: "100vh",
      background: "#0A0A0F",
      color: "#E4E4E7",
      fontFamily: "'JetBrains Mono', monospace",
      padding: isMobile ? "16px" : "32px",
    },
    header: {
      display: "flex",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      flexDirection: isMobile ? "column" : "row",
      gap: 12,
      marginBottom: 24,
    },
    title: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: isMobile ? 20 : 28,
      fontWeight: 700,
    },
    gold: { color: "#D4A843" },
    green: { color: "#22C55E" },
    dim: { color: "#71717A" },
    card: {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: isMobile ? 16 : 24,
    },
    input: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 14px",
      color: "#E4E4E7",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      outline: "none",
      width: "100%",
    },
    btn: {
      background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
      color: "#0A0A0F",
      border: "none",
      borderRadius: 8,
      padding: "10px 24px",
      fontWeight: 700,
      fontSize: 12,
      fontFamily: "'Space Grotesk', sans-serif",
      cursor: "pointer",
      letterSpacing: "0.05em",
    },
    tabBar: {
      display: "flex",
      gap: 4,
      marginBottom: 20,
      flexWrap: "wrap",
    },
    tab: (active) => ({
      padding: isMobile ? "6px 10px" : "8px 16px",
      borderRadius: 6,
      fontSize: isMobile ? 9 : 11,
      fontWeight: 600,
      letterSpacing: "0.08em",
      cursor: "pointer",
      border: "1px solid",
      borderColor: active ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)",
      background: active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
      color: active ? "#22C55E" : "#71717A",
      transition: "all 0.2s",
    }),
    badge: (color) => ({
      display: "inline-block",
      marginLeft: 6,
      padding: "1px 6px",
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 700,
      background: `${color}22`,
      color,
    }),
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: isMobile ? 10 : 12,
    },
    th: {
      textAlign: "left",
      padding: "8px 6px",
      fontSize: isMobile ? 8 : 9,
      color: "#71717A",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      fontWeight: 600,
    },
    td: {
      padding: "10px 6px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      verticalAlign: "middle",
    },
    check: (done) => ({
      width: 20,
      height: 20,
      borderRadius: 4,
      border: `2px solid ${done ? "#22C55E" : "rgba(255,255,255,0.15)"}`,
      background: done ? "rgba(34,197,94,0.15)" : "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      color: "#22C55E",
      transition: "all 0.2s",
      flexShrink: 0,
    }),
    statusPill: (status) => {
      const colors = {
        canceled: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
        past_due: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
        annual: { bg: "rgba(212,168,67,0.1)", color: "#D4A843" },
      };
      const c = colors[status] || colors.canceled;
      return {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        textTransform: "uppercase",
      };
    },
  };

  // ── Login Gate ──
  if (!unlocked) {
    return (
      <div style={s.page}>
        <div
          style={{
            maxWidth: 400,
            margin: "120px auto",
            ...s.card,
          }}
        >
          <div style={{ ...s.title, marginBottom: 4 }}>
            <span style={s.gold}>CHURN</span>{" "}
            <span style={s.green}>CONTROL</span>
          </div>
          <p
            style={{
              ...s.dim,
              fontSize: 10,
              marginBottom: 20,
              letterSpacing: "0.05em",
            }}
          >
            10AMPRO SUBSCRIBER MANAGEMENT
          </p>
          <form onSubmit={handleUnlock}>
            <input
              style={{ ...s.input, marginBottom: 12 }}
              type="password"
              placeholder="Access code..."
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoFocus
            />
            <button
              style={{ ...s.btn, width: "100%" }}
              type="submit"
              disabled={loading}
            >
              {loading ? "CHECKING..." : "UNLOCK"}
            </button>
          </form>
          {error && (
            <p
              style={{
                color: "#EF4444",
                fontSize: 11,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Main Dashboard ──
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>
            <span style={s.gold}>CHURN</span>{" "}
            <span style={s.green}>CONTROL</span>
          </div>
          <p
            style={{
              ...s.dim,
              fontSize: 10,
              marginTop: 2,
              letterSpacing: "0.05em",
            }}
          >
            ALPHA CHAT CLEANUP — CANCELED &gt; 30 DAYS
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {data && (
            <span
              style={{
                fontSize: 10,
                ...s.dim,
              }}
            >
              {pendingCount > 0 ? (
                <>
                  <span style={{ color: "#EF4444", fontWeight: 700 }}>
                    {pendingCount}
                  </span>{" "}
                  pending removal
                </>
              ) : (
                <span style={{ color: "#22C55E" }}>All clear ✓</span>
              )}
            </span>
          )}
          <button
            style={{
              ...s.btn,
              padding: "8px 16px",
              fontSize: 10,
              opacity: loading ? 0.5 : 1,
            }}
            onClick={() => fetchChurn(pass)}
            disabled={loading}
          >
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {!data && loading && (
        <div style={{ ...s.card, textAlign: "center", padding: 60, marginTop: 24 }}>
          <div style={{ fontSize: 14, color: "#22C55E", marginBottom: 8 }}>Loading Stripe data...</div>
          <div style={{ fontSize: 11, color: "#71717A" }}>Fetching subscriptions</div>
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, 1fr)"
              : "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "TO REMOVE",
              value: data.summary.toRemove,
              color: "#EF4444",
            },
            {
              label: "STILL ACTIVE",
              value: data.summary.stillActive || 0,
              color: "#D4A843",
            },
            {
              label: "RECENT CANCELS",
              value: data.summary.recentCancels,
              color: "#F59E0B",
            },
            {
              label: "PAST DUE",
              value: data.pastDue?.length || 0,
              color: "#F97316",
            },
            {
              label: "RE-SUBBED",
              value: data.summary.resubbed,
              color: "#22C55E",
            },
          ].map((c) => (
            <div key={c.label} style={s.card}>
              <div
                style={{
                  fontSize: 8,
                  color: "#71717A",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk'",
                  color: c.color,
                }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Search */}
      {data && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={s.tabBar}>
              {TABS.map((t) => (
                <div
                  key={t.key}
                  style={s.tab(tab === t.key)}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.count != null && (
                    <span
                      style={s.badge(
                        tab === t.key ? "#22C55E" : "#71717A"
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4,
                padding: 3,
              }}
            >
              {[
                { key: "all", label: "ALL", color: "#71717A" },
                { key: "substack", label: "SUBSTACK", color: "#FF6719" },
                { key: "gumroad", label: "GUMROAD", color: "#FF90E8" },
              ].map((f) => {
                const active = sourceFilter === f.key;
                const count =
                  f.key === "all"
                    ? data?.summary?.bySource
                      ? data.summary.bySource.substack +
                        data.summary.bySource.gumroad
                      : null
                    : data?.summary?.bySource?.[f.key] ?? null;
                return (
                  <div
                    key={f.key}
                    onClick={() => setSourceFilter(f.key)}
                    style={{
                      cursor: "pointer",
                      padding: "5px 9px",
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      background: active ? f.color : "transparent",
                      color: active ? "#000" : f.color,
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {f.label}
                    {count != null && (
                      <span
                        style={{
                          fontSize: 8,
                          opacity: active ? 0.7 : 0.6,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <input
              style={{
                ...s.input,
                maxWidth: isMobile ? "100%" : 220,
                fontSize: 11,
                padding: "6px 10px",
              }}
              type="text"
              placeholder="Search email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Gumroad cleanup view */}
          {tab === "gumroad" && (
            <div style={{ ...s.card, padding: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#FF90E8",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    🛒 GUMROAD CLEANUP
                  </span>
                  {gumroadData && (
                    <span style={{ fontSize: 10, color: "#71717A" }}>
                      {gumroadData.pending} pending · {gumroadData.done} done · {gumroadData.total} total
                    </span>
                  )}
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    color: "#71717A",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={gumroadHideDone}
                    onChange={(e) => setGumroadHideDone(e.target.checked)}
                  />
                  Hide done
                </label>
              </div>
              <div style={{ overflow: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>{"✓"}</th>
                      <th style={s.th}>Email</th>
                      <th style={s.th}>Expired</th>
                      {!isMobile && <th style={s.th}>Days ago</th>}
                      {!isMobile && <th style={s.th}>Removed at</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {!gumroadData && (
                      <tr>
                        <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#71717A", padding: 40 }}>
                          Loading…
                        </td>
                      </tr>
                    )}
                    {gumroadData?.entries
                      ?.filter((r) => {
                        if (gumroadHideDone && r.removed_at) return false;
                        if (search.trim()) {
                          return r.email.toLowerCase().includes(search.toLowerCase());
                        }
                        return true;
                      })
                      .map((r) => {
                        const done = !!r.removed_at;
                        const expDt = new Date(r.expired_date);
                        const daysAgo = Math.floor((Date.now() - expDt.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={r.email} style={{ opacity: done ? 0.4 : 1 }}>
                            <td style={s.td}>
                              <div
                                onClick={() => toggleGumroad(r.email, done)}
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 3,
                                  border: done ? "1px solid #22C55E" : "1px solid #52525B",
                                  background: done ? "#22C55E" : "transparent",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#000",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {done ? "✓" : ""}
                              </div>
                            </td>
                            <td style={{ ...s.td, textDecoration: done ? "line-through" : "none" }}>
                              {r.email}
                            </td>
                            <td style={{ ...s.td, ...s.dim }}>{r.expired_date}</td>
                            {!isMobile && (
                              <td
                                style={{
                                  ...s.td,
                                  fontWeight: 700,
                                  color: daysAgo > 90 ? "#EF4444" : daysAgo > 30 ? "#F59E0B" : "#71717A",
                                }}
                              >
                                {daysAgo}d
                              </td>
                            )}
                            {!isMobile && (
                              <td style={{ ...s.td, ...s.dim }}>
                                {r.removed_at ? new Date(r.removed_at).toLocaleDateString() : "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table */}
          {tab !== "gumroad" && (
          <div style={{ ...s.card, padding: 0, overflow: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {tab === "remove" && <th style={s.th}>✓</th>}
                  <th style={s.th}>Email</th>
                  {!isMobile && <th style={s.th}>Name</th>}
                  <th style={s.th}>Source</th>
                  <th style={s.th}>Plan</th>
                  <th style={s.th}>Canceled</th>
                  <th style={s.th}>{tab === "active" ? "Expires" : "Days"}</th>
                  {!isMobile && <th style={s.th}>Amount</th>}
                </tr>
              </thead>
              <tbody>
                {currentList.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...s.td,
                        textAlign: "center",
                        color: "#71717A",
                        padding: 40,
                      }}
                    >
                      {loading
                        ? "Loading..."
                        : search
                        ? "No results"
                        : "Empty — nothing here"}
                    </td>
                  </tr>
                )}
                {currentList.map((sub) => {
                  const isDone = !!removed[sub.email];
                  return (
                    <tr
                      key={sub.subscriptionId}
                      style={{
                        opacity: isDone && tab === "remove" ? 0.35 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {tab === "remove" && (
                        <td style={s.td}>
                          <div
                            style={s.check(isDone)}
                            onClick={() => toggleRemoved(sub.email)}
                          >
                            {isDone && "✓"}
                          </div>
                        </td>
                      )}
                      <td
                        style={{
                          ...s.td,
                          fontWeight: 500,
                          color: "#E4E4E7",
                          maxWidth: isMobile ? 160 : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sub.email}
                        {isMobile && sub.name && (
                          <div
                            style={{
                              fontSize: 9,
                              color: "#71717A",
                              marginTop: 2,
                            }}
                          >
                            {sub.name}
                          </div>
                        )}
                      </td>
                      {!isMobile && (
                        <td style={{ ...s.td, ...s.dim }}>
                          {sub.name || "—"}
                        </td>
                      )}
                      <td style={s.td}>
                        {(() => {
                          const src = sub.source || "gumroad";
                          const cfg =
                            src === "substack"
                              ? { bg: "rgba(255,103,25,0.12)", color: "#FF6719", label: "SUBSTACK" }
                              : { bg: "rgba(255,144,232,0.12)", color: "#FF90E8", label: "GUMROAD" };
                          return (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 3,
                                fontSize: 8,
                                fontWeight: 700,
                                background: cfg.bg,
                                color: cfg.color,
                                letterSpacing: "0.08em",
                              }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={s.td}>
                        <span style={s.statusPill(sub.isAnnual ? "annual" : sub.status)}>
                          {sub.isAnnual
                            ? "ANNUAL"
                            : sub.status === "past_due"
                            ? "PAST DUE"
                            : "MONTHLY"}
                        </span>
                      </td>
                      <td style={{ ...s.td, ...s.dim }}>
                        {fmtDate(sub.canceledAt)}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          fontWeight: 700,
                          color:
                            sub.isAnnual && !sub.accessExpired
                              ? "#D4A843"
                              : sub.accessExpired
                              ? "#EF4444"
                              : "#F59E0B",
                        }}
                      >
                        {sub.isAnnual && sub.daysUntilExpiry != null
                          ? sub.daysUntilExpiry > 0
                            ? `${sub.daysUntilExpiry}d left`
                            : "expired"
                          : `${sub.daysSinceCancel ?? "—"}d ago`}
                      </td>
                      {!isMobile && (
                        <td style={{ ...s.td, ...s.dim }}>
                          ${sub.amount}{" "}
                          {sub.currency?.toUpperCase()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 16,
              fontSize: 9,
              color: "#52525B",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              Fetched: {data.fetchedAt ? fmtDate(data.fetchedAt) : "—"}
            </span>
            <span>
              {data.summary.totalCanceled} total canceled ·{" "}
              {data.summary.totalPastDue} past due
            </span>
          </div>
        </>
      )}

      {error && !loading && (
        <div
          style={{
            ...s.card,
            marginTop: 24,
            textAlign: "center",
            color: "#EF4444",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
