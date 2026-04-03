# 10AMPRO Growth Dashboard — Status & Update Playbook

**Last updated:** April 3, 2026
**Repo:** `10amalpha/10am-growth`
**Live:** https://10am-growth.vercel.app/ (also https://growth.10am.pro/)

---

## Monthly Update Checklist (~15 min with Claude)

Run on the 3rd–5th of each month. Give Claude: the bank statement PDF, the GSheet screenshot, and the Substack CSV. Claude does the rest.

### Step 1: Collect Inputs (Hernán does)

| Input | Where to get it | What Claude needs |
|---|---|---|
| **Bank statement PDF** | Bank of America app → Download statement | Upload PDF |
| **GSheet P&L screenshot** | Google Sheets budget → screenshot both revenue + expense rows for the month | Upload screenshot |
| **Substack CSV** | 10am.pro → Settings → Growth → Export CSV | Upload CSV file |
| **Spotify followers** | creators.spotify.com → show page | Screenshot |
| **TikTok followers** | TikTok app → Profile | Screenshot |
| **X followers** | x.com/10ampro | Just give the URL, Claude scrapes |
| **LinkedIn followers** | linkedin.com/company/102905872/admin/dashboard/ | Just give the URL, Claude scrapes |

**Auto-fetched by Claude (no input needed):**
- YouTube subscribers → `/api/channel-stats` (YouTube Data API)
- Instagram followers → `/api/channel-stats` (IG Graph API)
- Substack subscriber count → scraped from 10am.pro/publish/subscribers via Chrome

### Step 2: Claude Updates (automated)

1. **data.js** — Add new month to `PNL_DATA` array with all revenue + expense line items
2. **data.js** — Update `STRATEGY_PATHS` current values (Substack subs, events count, etc.)
3. **Supabase** — PATCH `growth_snapshots` row for the month (follower counts + revenue totals)
4. **Dashboard.jsx** — Update Conversión tab with fresh CSV data (channel rates, recs network, monthly table, insights)
5. **Cross-update** — Wenia dashboard (`CHANNEL_AUDIENCE`) + Anuncia10am (audience total calc)

### Step 3: Deploy (automated)

- `npx next build` → verify zero errors
- `git push` → Vercel auto-deploys
- Verify at https://10am-growth.vercel.app/

---

## Architecture

### Data Sources

```
┌─────────────────────────────────────────────────┐
│                  DATA LAYER                      │
├──────────────┬──────────────┬────────────────────┤
│  Supabase    │  data.js     │  /api/channel-stats│
│  (monthly    │  (P&L detail │  (live YouTube +   │
│   snapshots) │   + strategy)│   Instagram API)   │
├──────────────┼──────────────┼────────────────────┤
│ Follower     │ PNL_DATA[]   │ YT Data API v3     │
│ counts ×8    │ PNL_REVENUE  │ IG Graph API v22   │
│ Rev totals   │ PNL_EXPENSES │                    │
│ Expenses     │ STRATEGY_    │ Auto-called on     │
│              │ PATHS        │ every page load    │
│ Key: month   │ CH_META      │                    │
│ (YYYY-MM)    │ STREAMS      │ Fallback: direct   │
│              │              │ YT API from browser│
└──────────────┴──────────────┴────────────────────┘
```

### Supabase Table: `growth_snapshots`

- **URL:** https://bzpraigsuwgjgpnclcpd.supabase.co
- **Anon Key:** `eyJhbGci...tBtsac6Mq65BiG93MhYtn1KV8iOGpEpVdlD3tqShrzE`
- **RLS:** Anon key has SELECT + UPDATE (no INSERT from anon — use dashboard Admin tab or browser PATCH)
- **Primary Key:** `month` (YYYY-MM format)

| Column | Type | Notes |
|---|---|---|
| month | text PK | "2026-03" |
| substack, youtube, tiktok, instagram, x_twitter, linkedin, spotify, apple_pods | int | Follower counts |
| rev_youtube, rev_gumroad_substack, rev_sponsors, rev_spotify, rev_events | numeric | Revenue by stream |
| rev_total | numeric | Sum of all revenue |
| expenses | numeric | Total expenses |
| updated_at | timestamp | Auto-set |

**How to PATCH from browser (since container can't reach Supabase):**
```javascript
// Run this in the growth dashboard page context via Chrome MCP
fetch('https://bzpraigsuwgjgpnclcpd.supabase.co/rest/v1/growth_snapshots?month=eq.2026-03', {
  method: 'PATCH',
  headers: {
    'apikey': 'ANON_KEY_HERE',
    'Authorization': 'Bearer ANON_KEY_HERE',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ rev_youtube: 4395.45, /* ... */ })
}).then(r => r.json()).then(console.log);
```

### data.js Structure

```javascript
// Revenue line items
PNL_REVENUE = [youtube, stripe, sponsors, spotify, events, paypal]

// Expense line items (as of Apr 2026)
PNL_EXPENSES = [gordo, podcastai, quickbooks, canva, anthropic, perplexity,
  openai, x_premium, google, replit, godaddy, notebooklm, tradingview,
  youtube_premium, api_fmp, luma, facebook_ads, bank_fees, otros]

// Each PNL_DATA row has ALL revenue + expense keys
{ month:"2026-03", youtube:4395.45, stripe:7776.56, ..., gordo:594, ..., otros:153.90 }
```

**When adding a new expense category:** Add to `PNL_EXPENSES` array AND add the key (set to 0) to ALL historical rows.

### Conversión Tab (Dashboard.jsx ~line 535–810)

All data is **hardcoded** from the Substack CSV export. Updated monthly by Claude.

**Sections to update:**
1. Top KPIs (all-time subs, visitors, best converter, revenue)
2. Conversion rate by channel (sorted by rate, with visitor/sub/rev counts)
3. Substack Recommendations network (top referrers, all-time subs)
4. Substack Notes performance (top notes by subs driven)
5. Monthly email capture table (subs/visitors/conv per month)
6. Monthly trends chart (subs + Google SEO subs + shorts views)
7. Insight cards (3 channel insights)
8. Episode conversion impact (3-day window analysis)
9. Emerging signals (high impact, growth levers, monitor)

**Source categorization logic (for CSV processing):**
- YouTube, TikTok, Instagram, X → direct channel match
- Google/Bing/DuckDuckGo/Yahoo/Brave/Perplexity/ChatGPT → "Google SEO"
- `Substack > Recommendations > *` → "Substack Recs"
- `Substack > Notes > *` → "Substack Notes"
- `Substack > Onboarding` → "Substack Onboarding"
- Direct + Direct to App → combined as "Direct"

---

## Cross-Update Checklist

When follower counts change, update these repos too:

| Repo | File | What to update |
|---|---|---|
| `wenia-dashboard` | `app/Dashboard.jsx` line ~120 | `CHANNEL_AUDIENCE` object (youtube, spotify, apple, tiktok, instagram) |
| `anuncia10am` | `sponsorship-section-v3.jsx` line ~314 | Audience total calc `(ytSubs \|\| N) + spotify + apple + x + substack` |

---

## Current State (April 2026)

### Follower Counts
| Channel | Count | Source | Live API? |
|---|---|---|---|
| TikTok | 50,000 | Screenshot | No |
| Spotify | 36,221 | Screenshot | No |
| YouTube | 23,800 | API | ✅ LIVE |
| Instagram | 17,605 | API | ✅ LIVE |
| X | 5,862 | Scraped | No |
| Substack | 4,728 | Scraped | No |
| LinkedIn | 1,302 | Scraped | No |
| Apple Pods | 6,000 | Static estimate | No |
| **Total** | **145,518** | | |

### Revenue (March 2026): $13,721.36/mo
- Stripe/Substack: $7,776.56 (56.7%)
- YouTube: $4,395.45 (32.0%)
- Events (AMAs + Eventos): $1,320.00 (9.6%)
- PayPal: $131.72 (1.0%)
- Spotify: $97.63 (0.7%)

### Expenses (March 2026): $1,809.76/mo
- Top: Gordo $594, NotebookLM $250, Anthropic $230, API FMP $228

### Key Metrics
- ARR: $164.7K (32.9% of $500K target)
- Take-home (each founder): ~$5,946/mo
- Rev per 1K followers: ~$94
- Substack conversion: 12.0% (March — record high)
- March new subs: 917 (record — driven by Hermanos Bilbao recs)

---

## API Keys & Credentials

| Service | Key/ID | Notes |
|---|---|---|
| YouTube Data API | `AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw` | Channel: `UC1yKEFqN6Tzz9DTK7fwS3LQ` |
| IG Graph API | `IG_ACCESS_TOKEN` env var on Vercel | Expires ~May 11, 2026 — REFRESH BEFORE |
| IG User ID | `17841455171483266` | FB Page: `1060185473841846` |
| Supabase | Anon key in `src/app/supabase.js` | SELECT + UPDATE via RLS |
| GitHub PAT | In `/mnt/skills/user/github-deploy/SKILL.md` | Token name: wineholdmybirra |

---

## Consistency Rules

1. **Apple Pods = 6,000** always. Static estimate. Never calculate from Spotify.
2. **Supabase rev_total** must equal sum of YouTube + Stripe + Sponsors + Spotify + Events + PayPal from GSheet.
3. **New expense categories** must be added to `PNL_EXPENSES` AND backfilled to all historical `PNL_DATA` rows (set to 0).
4. **data.js uses accrual-basis** revenue (from GSheet), NOT cash-basis (from bank statement). Bank deposits span accrual periods.
5. **Conversión tab is hardcoded** — updated monthly from Substack CSV, not from any API.
6. **Container cannot reach** Supabase, googleapis.com, or graph.facebook.com — use Chrome MCP for live API calls and Supabase patches.
7. **Always `npx next build` before pushing** — catches type errors and JSX issues.
8. **Commit incrementally** — every step that compiles gets pushed immediately.
