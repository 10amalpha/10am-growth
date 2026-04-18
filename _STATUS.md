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

## 🚀 IG Boost Feature (Apr 18, 2026)

**Goal:** Automate recommendation of which IG Reels to boost for email conversion, replacing manual CSV analysis.

### Architecture

| Piece | Purpose |
|---|---|
| `api/cron/compute-ig-boost.js` | Daily 8 AM UTC. Pulls last 28d of IG Reels via Graph API v22.0, filters ≤60s (Boost eligibility), scores by conversion signals, upserts top 10 to Supabase |
| `api/ig-boost-recommendations.js` | GET latest snapshot from Supabase |
| `api/substack-posts.js` | GET last 50 posts from `10am.pro/feed` RSS — populates landing dropdown |
| `api/ig-boost-tracking.js` | POST saves boost decisions, GET returns history |
| `src/app/IgBoostTab.jsx` | Frontend: Top 3 cards + candidates table + history |
| `supabase-ig-boost-schema.sql` | Schema for `ig_boost_recommendations` and `ig_boost_tracking` tables |

### Scoring Formula (v1)

```
score = (follows_per_1k × 3) + (saves_per_1k × 2) + (profile_visits_per_1k × 1.5) + (engagement_rate × 10)
```

- **Follows/1K**: strongest signal — follow means user navigated to profile (one tap from bio link)
- **Saves/1K**: depth signal — user wants to reference the content again
- **Profile visits/1K**: bio-link proximity
- **ER (likes+comments+shares+saves / views × 100)**: Meta's paid-delivery multiplier

**Filters applied:**
- Duration ≤60s (hard IG Boost limit — 60s+ requires Ads Manager)
- Published within last 28 days
- Views ≤ 3× median of eligible clips (excludes already-burned-out virals)

### First-time setup (ONE TIME)

1. **Run SQL** in Supabase SQL Editor: `supabase-ig-boost-schema.sql`
2. **Verify Vercel env vars** for `10am-growth` project:
   - `IG_ACCESS_TOKEN` — same token as shorts-analytics (expires ~May 11, 2026)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already set)
   - `CRON_SECRET` — optional, for Vercel cron auth
3. **Trigger cron manually** to populate first batch:
   ```
   GET https://growth.10am.pro/api/cron/compute-ig-boost?pass=elgordo
   ```
4. Open **https://growth.10am.pro** → 🚀 IG Boost tab

### Workflow (ongoing)

1. Cron runs daily at 8 AM UTC → writes top 10 recommendations to Supabase
2. Hernán opens IG Boost tab → sees Top 3 with scoring reasoning
3. Picks landing from Substack dropdown, sets budget + days, edits UTM campaign slug
4. Clicks "Marcar como boosteado" → row saved to `ig_boost_tracking`
5. Copies the UTM-appended URL and pastes into IG's native Boost flow
6. Monthly: cross-reference `utm_campaign` values with Substack sources CSV to fill `emails_attributed` field manually
7. Over time: cost/email per campaign becomes the feedback loop to tune scoring weights

### Future improvements

- Auto-match Substack post to clip via Claude API (currently manual dropdown — decided Apr 18 for MVP speed)
- Add TikTok scoring when API access exists (same scoring model, different eligibility rules)
- Add YouTube Shorts scoring via YT Data API
- Auto-fill `emails_attributed` by parsing Substack sources CSV upload
- A/B test different UTM landing structures

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
