# 10AMPRO Growth Dashboard — Status & Update Playbook

**Last updated:** April 3, 2026
**Repo:** `10amalpha/10am-growth`
**Live:** https://10am-growth.vercel.app/ (also https://growth.10am.pro/)

---

## Dashboard Structure (6 Tabs)

| Tab | Key | Contents |
|---|---|---|
| 🏁 **$500K** | tracker | ARR tracker, milestones, revenue stack, Stripe ARR curve ($400→$36K), Events/AMAs tracker (Luma), revenue model |
| 🎯 **Strategy** | strategy | 5 strategic paths + email-first deep dive (sub-sections: Overview, Decision, $0 Channels, Funnel, Playbook, Compare) |
| 🔄 **Conversion** | conversion | Substack source conversion rates, recs network, notes performance, monthly email capture, episode impact, emerging signals |
| 💵 **Financials** | financials | P&L detail by line item + revenue area chart + profit margin chart + Subscriber Health (churn tracking, cohort retention waterfall, MRR risk split, risk flags) |
| 📈 **Audience** | audience | Follower counts by channel (8 channels, 2 LIVE API) + growth velocity rates |
| ⚙️ **Admin** | admin | Supabase upsert form (password protected) |

---

## Monthly Update Checklist (~15 min with Claude)

Run on the 3rd–5th of each month.

### Step 1: Collect Inputs (Hernán does)

| Input | Where to get it | What Claude needs |
|---|---|---|
| **Bank statement PDF** | Bank of America app → Download statement | Upload PDF |
| **GSheet P&L screenshot** | Google Sheets budget → screenshot revenue + expense rows | Upload screenshot |
| **Substack CSV** | 10am.pro → Settings → Growth → Export CSV | Upload CSV file |
| **Stripe customers CSV** | Stripe → Customers → Export (all columns) | Upload CSV — for churn tracking |
| **Stripe ARR CSV** | Stripe → Revenue → Export daily ARR | Upload CSV — for ARR curve |
| **Spotify followers** | creators.spotify.com → show page | Screenshot |
| **TikTok followers** | TikTok app → Profile | Screenshot |
| **X followers** | Give URL: x.com/10ampro | Claude scrapes via Chrome |
| **LinkedIn followers** | Give URL: linkedin.com/company/102905872/admin/dashboard/ | Claude scrapes via Chrome |

**Auto-fetched by Claude (no input needed):**
- YouTube subscribers → `/api/channel-stats` (YouTube Data API)
- Instagram followers → `/api/channel-stats` (IG Graph API)
- Substack subscriber count → scraped from 10am.pro/publish/subscribers via Chrome

### Step 2: Claude Updates (automated)

1. **data.js** — Add new month to `PNL_DATA` with all revenue + expense line items
2. **data.js** — Update `STRATEGY_PATHS` current values
3. **Supabase** — PATCH `growth_snapshots` row via browser (container can't reach Supabase)
4. **Dashboard.jsx — Conversion tab** — Update from Substack CSV (channel rates, recs network, monthly table, insights)
5. **Dashboard.jsx — Financials tab** — Update Subscriber Health (cohort retention, MRR risk split, risk flags, delinquent accounts)
6. **Dashboard.jsx — $500K tab** — Update Stripe ARR chart + Events/AMAs from Luma
7. **Cross-update** — Wenia dashboard (`CHANNEL_AUDIENCE`) + Anuncia10am (audience total)

### Step 3: Deploy

- `npx next build` → verify zero errors
- `git push` → Vercel auto-deploys

---

## Data Architecture

### Supabase: `growth_snapshots`

- **URL:** https://bzpraigsuwgjgpnclcpd.supabase.co
- **Anon Key:** in `src/app/supabase.js`
- **RLS:** Anon key has SELECT + UPDATE. No INSERT from anon.
- **Primary Key:** `month` (YYYY-MM)
- **How to PATCH:** Run fetch() in growth dashboard page context via Chrome MCP (container is blocked)

### data.js

Revenue keys: youtube, stripe, sponsors, spotify, events, paypal

Expense keys (20): gordo, podcastai, quickbooks, canva, anthropic, perplexity, openai, x_premium, google, replit, godaddy, notebooklm, tradingview, youtube_premium, api_fmp, luma, facebook_ads, bank_fees, otros

**New expense categories** must be added to PNL_EXPENSES AND backfilled to all historical PNL_DATA rows with 0.

### Subscriber Health (Financials tab)

Hardcoded in Dashboard.jsx. Updated monthly from Stripe customers CSV.

**Critical: Substack billing model** — Monthly=$40/mo auto-renew. Annual=$400 upfront (locked 12mo). Black=$1,500 upfront. A customer with 1 payment and $400 spend is an annual sub, NOT at churn risk. Only track churn on monthly $40 subs.

**Retention stack** (all referenced in insights): mercados.10am.pro (daily habit, code ELGORDO) + AMAs (monthly $15 engagement) + Cerebro AI (knowledge engine) + el Búnker (WhatsApp)

### Conversion Tab

All data hardcoded from Substack CSV. Source categorization: YouTube/TikTok/Instagram/X → direct match. Google/Bing/DuckDuckGo → "Google SEO". `Substack > Recommendations > *` → "Substack Recs". Direct + Direct to App → "Direct".

---

## Cross-Update Checklist

| Repo | File | What |
|---|---|---|
| `wenia-dashboard` | `app/Dashboard.jsx` ~line 120 | `CHANNEL_AUDIENCE` object |
| `anuncia10am` | `sponsorship-section-v3.jsx` ~line 314 | Audience total calc |

---

## Current State (April 13, 2026)

### Followers: 145,518 total

TikTok 50,000 | Spotify 36,221 | YouTube 23,800 (LIVE) | Instagram 17,605 (LIVE) | X 5,862 | Substack 4,728 | LinkedIn 1,302 | Apple 6,000

### Revenue (March 2026): $13,721/mo

Stripe $7,777 (56.7%) | YouTube $4,395 (32.0%) | Events $1,320 (9.6%) | PayPal $132 | Spotify $98

### Expenses (March 2026): $1,810/mo

### Stripe ARR: $36,103

MRR $3,009 | Daily growth +$281 | Trajectory: $400→$36K in 127 days

### Subscriber Health

61 active + 9 trialing | 1 cancel pending (Black $888) | 4 delinquent → removed Apr 3

MRR locked (annual/Black): $888 (32%) | MRR at risk (monthly): $1,915 (68%)

Cohort retention (monthly subs only): Jan M3 67% | Feb M2 88% | Mar M1 100%

### Key Insights

- **Hermanos Bilbao:** 631 subs, $0 rev (0% paid) — volume without monetization. ARIAS: 188 subs, $1,360 (18% paid) — the quality benchmark.
- **March record:** 917 new subs, 12% conv. But 58% from HB at 0% paid.
- **YouTube memberships declining:** Peak $5,166 (Mar 2025) → $4,195 (Mar 2026). ~840 members migrating to Substack (intentional — 8× more valuable).
- **Retention improving:** Jan M2 83% → Feb M2 88%. Check Mar M2 in May to validate retention stack.
- **Retention stack:** mercados.10am.pro + AMAs + Cerebro AI + el Búnker. Activation sequence: welcome email → Mercados code → Búnker invite → AMA invite (must hit in week 1).

### Luma Events: 4 active, 293 registrations

Alpha 63 (76, $15) | Alpha 64 (24, $15) | Ep200 Fireside (163, $40) | Almuerzo (30, SOLD OUT)

---

## Churn Control System (added April 13, 2026)

### Overview

Automated subscriber cleanup tool for the 10am Alpha WhatsApp chat. Live at:
- **Dashboard:** https://growth.10am.pro/admin/churn (password: `elgordo`)
- **API:** `/api/churn` — Stripe subscriber status (password-gated)
- **Removed tracking:** `/api/churn-removed` — Supabase persistence for checked-off members
- **Daily cron:** `/api/cron/churn-notify` — email alerts for newly expired subs

### How it works

1. Fetches all canceled + past_due subscriptions from Stripe API (pinned to version `2023-10-16`)
2. Cross-references active subscriptions to detect re-subscribers
3. **Monthly plans ($40/mo):** access expires 30 days after cancellation → moves to "TO REMOVE"
4. **Annual plans ($400/yr):** access expires at Stripe `current_period_end` (full year honored) → "STILL ACTIVE" until then
5. Checked-off members saved to Supabase `churn_removed` table (persists across devices)

### Dashboard tabs

| Tab | What | Color |
|---|---|---|
| REMOVE | Canceled 30+ days (monthly) or period expired (annual), not re-subbed | Red |
| STILL ACTIVE | Annual subs within prepaid period, shows "Xd left" countdown | Gold |
| RECENT | Canceled < 30 days, grace period | Yellow |
| PAST DUE | Payment failed, sub still technically active | Orange |
| RE-SUBBED | Canceled then came back — safe, leave in chat | Green |

### Email notifications (Vercel Cron)

- **Schedule:** Daily at 8:00 AM COT (13:00 UTC) — `vercel.json` cron: `"0 13 * * *"`
- **Recipients:** hernanjaramillo@gmail.com + info@10am.pro
- **Triggers ONLY when:** a monthly sub hits 30-day mark OR an annual sub's period_end passes OR an annual sub expires within 7 days
- **Silent on quiet days** — no email sent if nothing to report
- **Email service:** Resend (free tier, 100/day)
- **Manual test:** `growth.10am.pro/api/cron/churn-notify?pass=elgordo`

### Environment variables (Vercel: 10am-growth)

| Key | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API (server-side only, never client-exposed) |
| `RESEND_API_KEY` | Email notifications via Resend |
| `CRON_SECRET` | Vercel cron auth (optional, falls back to admin pass) |

### Supabase table: `churn_removed`

- **Columns:** `email` (PK), `removed_at` (timestamptz), `removed_by` (text)
- **RLS:** Open for all (policy: `USING (true) WITH CHECK (true)`)
- **Purpose:** Persist checkbox state so removed members don't reappear as pending

### Files added

| File | Purpose |
|---|---|
| `api/churn.js` | Stripe subscriber status API (all tabs data) |
| `api/churn-removed.js` | Supabase read/write for removed checkmarks |
| `api/cron/churn-notify.js` | Daily email notification cron job |
| `src/app/admin/churn/page.js` | Frontend dashboard (password-gated) |
| `vercel.json` | Cron schedule config |

---

## 🚀 IG Boost Feature (Apr 18–19, 2026)

**Goal:** Measure **cost per email** and **cost per paid sub** for IG boosts — replace "boost by feel" with a data-driven loop. Recommend which reel to boost, which landing to send traffic to, and track ROI end-to-end.

### Evolution note

Started Apr 18 as a cron-based architecture (daily precompute → Supabase cache → UI). Refactored Apr 19 to **live fetch** — simpler, always fresh, easier to extend to TikTok/YT later. Cron + recommendations table are deprecated but the SQL table remains (harmless, can drop later).

### Architecture (current — live fetch)

| Piece | Purpose |
|---|---|
| `api/ig-boost-live.js` | **Live fetch endpoint (~30s)** — pulls last 28d of reels via Meta Graph API v22.0 using Batch API, scores by conversion signals, returns top 10. Called on every tab load. `Cache-Control: no-store` |
| `api/ig-boost-metrics.js` | GET current metrics for a list of media IDs (used by tracking history for delta computation) |
| `api/substack-posts.js` | GET last 50 posts from `10am.pro/feed` RSS (cache 60s). Populates landing dropdown |
| `api/ig-boost-tracking.js` | GET history, POST new boost (with baselines), PATCH updates (`emails_attributed`, `paid_subs_attributed`, `status`, etc.) |
| `src/app/IgBoostTab.jsx` | Frontend: Top 3 cards + candidates table + CAC-first tracking history |
| `supabase-ig-boost-schema.sql` | Initial schema for `ig_boost_tracking` table |
| `supabase-ig-boost-migration-1.sql` | Adds baseline metric columns + `paid_subs_attributed`, `mrr_attributed` |

### Scoring formula (v1)

```
score = (follows_per_1k × 3) + (saves_per_1k × 2) + (profile_visits_per_1k × 1.5) + (engagement_rate × 10)
```

**Why these signals:**
- **Follows/1K**: strongest — follow means user went to profile (one tap from bio link)
- **Saves/1K**: depth signal — reference content the user wants to return to
- **Profile visits/1K**: bio-link proximity (not always returned by Meta API)
- **ER**: Meta's paid-delivery amplifier — higher ER = cheaper reach on boost

**Meta API quirks discovered:**
- `video_duration` field returns 400 on v22.0 — duration is null for all clips, filter relaxed to allow unknown duration
- `views` sometimes comes as 0 — fallback chain: `views` → `ig_reels_aggregated_all_plays_count` → `reach`
- `follows` and `profile_visits` not always returned — handled gracefully (defaults to 0)
- Must use Batch API (50 reels/request) to avoid timeout on `/insights` per-reel

**Filters applied:**
- Reels only (`media_product_type === "REELS"` OR `media_type === "VIDEO"`)
- Published within last 28 days
- Views ≥ 500 (minimum baseline for signal)
- Views ≤ 3× median of eligible clips (excludes already-burned virals)

### UI architecture — CAC-first design (Apr 19)

The 2 metrics that matter for the business: **$/email** and **$/paid sub**. Everything else is secondary.

**Tracking history shows (in order):**
1. **Aggregate summary** — 4 big boxes: $/email agg · $/paid agg · Total invested · Pending attribution. Plus benchmark line showing ✓/⚠/✗ vs targets ($5/email, $80/paid)
2. **Per-boost card** — 5 boxes at top: $ Invested · Emails · **$/EMAIL** · Paid · **$/PAID**. The 2 stars are 22px font, bordered, always visible
3. **IG delta (views/follows/saves/profile_visits)** — collapsed into `<details>` dropdown. Secondary context only

**Landing URL selection logic:**
- Topical matching against last 50 Substack posts (counts overlapping signal words ≥4 chars between caption and post title, excluding stopwords)
- Best match 🎯 auto-selected per clip
- Homepage deprioritized with ⚠️ red warning ("1.3% conv vs 8%+ for topical posts")
- `/subscribe` as fallback when no topical post exists

### First-time setup (ONE TIME, done Apr 19)

1. ✅ Schema SQL run in Supabase
2. ✅ Migration SQL run (adds baseline_* and paid_subs_attributed, mrr_attributed)
3. ✅ Env vars verified (`IG_ACCESS_TOKEN` already set from shorts-analytics, expires ~May 11 2026)
4. ✅ First boost inserted via one-shot admin endpoint (since POST from Vercel web fetch isn't reliable from outside the browser)

### Workflow (ongoing)

1. Open **growth.10am.pro → 🚀 IG Boost** → wait ~30s for live fetch
2. See Top 3 recommended clips with reasoning
3. Check the 🎯 auto-selected landing → override from dropdown if needed
4. Set budget + days → UTM campaign slug auto-generated (editable)
5. Copy the URL with UTMs, paste into Meta's Boost flow (Goal: "Get more website visitors", Button: "Sign up", Advantage+ creative: OFF)
6. In Meta: set budget/duration, wait for approval, launch
7. Back in growth.10am.pro → click "✓ Marcar como boosteado" → baseline captured automatically
8. **CRITICAL:** UTM in the tab must exactly match the UTM in the Meta ad URL
9. Days later: tab shows IG delta live (views/follows growth from the boost)
10. After campaign ends: export Substack sources CSV → filter by utm_campaign → click the "Emails captados" field in the tab → type the number → Enter. `$/email` auto-computes
11. When users convert to paid (via Stripe), click "Paid subs" in the tab → update manually → `$/paid` auto-computes

### Active boost (as of Apr 19 2026)

| Field | Value |
|---|---|
| Clip | Donald Trump y la teoría del Madmen (11 abr 2026) |
| Reel | https://www.instagram.com/reel/DXAk65RjSnQ/ |
| Landing | https://www.10am.pro/p/e204-estados-unidos-en-busca-del |
| UTM | `e204_usa_abr26` |
| Budget | $98 ($14/day × 7 days) |
| End date | 26 Apr 2026 |
| Baseline | Views 6,916 · Reach 4,684 · Likes 250 · Comments 10 · Shares 66 · Saves 23 · ER 5.05% |
| Meta ad status | In review as of Apr 19 15:26 UTC |
| Supabase row ID | 1 |
| Payment | Visa ****6491 (Tareasplus) |

**What to track:**
- Day 1-2: arrives out of review, delivery starts
- Day 3-4: learning phase ends, CPC stabilizes
- Day 7 (26 abr): boost ends → export Substack CSV → update `emails_attributed`
- Day 30+: check Stripe for paid conversions → update `paid_subs_attributed`

### Benchmarks (target ranges)

| Metric | Target | Alert threshold |
|---|---|---|
| $/email | < $5 | > $10 |
| $/paid sub | < $80 (≈ 10mo payback at $8/mo) | > $150 |

**Decision rule:** If $/email > $15 or $/paid > $150 across 3+ boosts, pause IG boost strategy. Data says: reconsider channel or landing strategy before scaling.

### Phase 2 — future improvements

- **Upload Substack sources CSV** in the tab → auto-match by `utm_campaign` → fills `emails_attributed` without manual entry
- **Stripe cross-reference** for automatic `paid_subs_attributed` (match emails captured → Stripe customers created post-boost date)
- **Extend to TikTok** via TikTok Research API (when approved)
- **Extend to YouTube Shorts** via YT Data API (already have key)
- **Auto-tune scoring weights** by regressing historical CAC outcomes against score components
- **Claude API topical matching** to replace keyword overlap (will handle synonyms, broader topical semantic match)

---

## API Keys & Credentials

| Service | Key/ID |
|---|---|
| YouTube Data API | `AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw` |
| YT Channel | `UC1yKEFqN6Tzz9DTK7fwS3LQ` |
| IG Graph API | `IG_ACCESS_TOKEN` env var on Vercel |
| IG User ID | `17841455171483266` |
| IG Token Expiry | ~May 11, 2026 — REFRESH BEFORE |
| Supabase | Anon key in `src/app/supabase.js` |
| GitHub PAT | In `/mnt/skills/user/github-deploy/SKILL.md` |
| Luma Calendar | `cal-yWCOIiS6eA71eGD` |

---

## Consistency Rules

1. Apple Pods = 6,000 always (static estimate)
2. data.js uses accrual-basis revenue (GSheet), NOT cash-basis (bank statement)
3. Annual/Black subs are NOT at churn risk — only track churn on monthly $40 subs
4. Container cannot reach Supabase or external APIs — use Chrome MCP
5. Always `npx next build` before pushing
6. Commit incrementally — every step that compiles gets pushed
7. Retention insights must reference the full stack: Mercados + AMAs + Cerebro + Búnker
