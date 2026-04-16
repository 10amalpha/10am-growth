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
  ];

  const currentList = useMemo(() => {
    if (!data) return [];
    let list = [];
    if (tab === "remove") list = data.toRemove || [];
    else if (tab === "active") list = data.stillActive || [];
    else if (tab === "recent") list = data.recentCancels || [];
    else if (tab === "past_due") list = data.pastDue || [];
    else if (tab === "resubbed") list = data.resubbed || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data, tab, search]);

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

          {/* Table */}
          <div style={{ ...s.card, padding: 0, overflow: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {tab === "remove" && <th style={s.th}>✓</th>}
                  <th style={s.th}>Email</th>
                  {!isMobile && <th style={s.th}>Name</th>}
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
