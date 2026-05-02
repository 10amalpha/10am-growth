# 10AMPRO Growth Dashboard — Status & Update Playbook

**Last updated:** April 29, 2026
**Repo:** `10amalpha/10am-growth`
**Live:** https://10am-growth.vercel.app/ (also https://growth.10am.pro/)

---

## Dashboard Structure (6 Tabs + 1)

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

## Churn Control System (added April 13, 2026, updated April 19, 2026)

### Overview

Automated subscriber cleanup tool for the 10am Alpha WhatsApp chat. Connects directly to Stripe API to track who has canceled and when their paid access expires. Sends daily email alerts when action is needed.

- **Dashboard:** https://growth.10am.pro/admin/churn (password: `elgordo`)
- **API:** `/api/churn` — Stripe subscriber status (password-gated via `?pass=elgordo`)
- **Removed tracking:** `/api/churn-removed` — Supabase read/write for checked-off members
- **Daily cron:** `/api/cron/churn-notify` — email alerts (Vercel Cron + Resend)
- **Manual cron test:** `growth.10am.pro/api/cron/churn-notify?pass=elgordo`

### How it works

1. Fetches all canceled + past_due subscriptions from Stripe API (pinned to version `2023-10-16` — required because the Stripe account was created in 2013 and the default API version doesn't support `status=canceled`)
2. Cross-references active subscriptions to detect re-subscribers (people who canceled then re-subbed are safe)
3. **Monthly plans ($40/mo):** access expires at Stripe's `current_period_end` date. Once that date passes → moves to "TO REMOVE"
4. **Annual plans ($400/yr):** access expires at Stripe `current_period_end` (full year honored). Shows in "STILL ACTIVE" with countdown until period expires
5. Checked-off members saved to Supabase `churn_removed` table (persists across devices/sessions)
6. Cron email cross-references `churn_removed` table — only reports expired subs you haven't checked off yet. Will keep emailing daily until you check them off on the dashboard

### Dashboard tabs (5 tabs)

| Tab | What | Color |
|---|---|---|
| REMOVE | `periodEnd` has passed AND not re-subbed AND not checked off | Red |
| STILL ACTIVE | Annual subs ($400/yr) within prepaid period, shows "Xd left" countdown | Gold |
| RECENT | Canceled but `periodEnd` hasn't passed yet (grace period, don't remove yet) | Yellow |
| PAST DUE | Payment failed, sub still technically active (Stripe retrying) | Orange |
| RE-SUBBED | Canceled then came back with a new active subscription — safe, leave in chat | Green |

### Dashboard features

- **Password gate:** `elgordo` — saved in `sessionStorage`, auto-restores on page load
- **Checkboxes (REMOVE tab only):** Check off members as you remove them from WhatsApp. Saved to Supabase `churn_removed` table
- **Pending counter:** Shows "X pending removal" in header — count of unchecked items in REMOVE tab
- **Search:** Filter by email or name across any tab
- **Plan column:** Shows ANNUAL or MONTHLY pill (gold/red)
- **Days column:** Shows "Xd ago" for monthly, "Xd left" or "expired" for annual
- **Mobile responsive:** `useIsMobile()` hook, responsive grid

### Email notifications (Vercel Cron)

- **Schedule:** Daily at 8:00 AM COT (13:00 UTC) — `vercel.json` cron: `"0 13 * * *"`
- **Vercel Cron Settings:** Registered and enabled (Vercel → 10am-growth → Settings → Cron Jobs). Can be manually triggered via "Run" button there
- **Recipients:** info@10am.pro only (Resend free tier limitation — `onboarding@resend.dev` sender can only email the account owner. To add hernanjaramillo@gmail.com, verify `10am.pro` domain at resend.com/domains and change `from` to `churn@10am.pro`)
- **Email service:** Resend (free tier, 100/day). API key stored as `RESEND_API_KEY` env var
- **From address:** `10AMPRO Churn Control <onboarding@resend.dev>` (Resend free tier default — change to `churn@10am.pro` after domain verification)
- **How it decides to send:** Cross-references Stripe expired subs against `churn_removed` Supabase table. If ANY sub has expired access AND is NOT checked off → sends email. Also sends 7-day heads-up for annual subs and 3-day heads-up for monthly subs about to expire. Also detects re-subscribers (someone who canceled and then re-subscribed) and sends a 🎉 alert — only once per re-sub, tracked in `churn_resub_notified` table
- **Silent when nothing to do:** No email if all expired subs are already checked off, nothing is expiring soon, and no new re-subs
- **Will keep emailing:** If you don't check someone off on the dashboard, the cron will report them again the next day. This is intentional — it's a reminder to take action
- **Auth:** Accepts Vercel's `Authorization: Bearer CRON_SECRET` header OR `?pass=elgordo` for manual testing. If `CRON_SECRET` env var is not set, the cron endpoint is open (Vercel invokes it anyway)

### Known issues & fixes applied

1. **Stripe API version:** Account from 2013 — must pin `Stripe-Version: 2023-10-16` header on all API calls or `status=canceled` returns error
2. **Session race condition (fixed Apr 16):** Two `useEffect` hooks caused password to be empty on auto-fetch. Fixed by combining into single useEffect that reads `sessionStorage` and passes value directly to `fetchChurn()`
3. **48-hour detection window (fixed Apr 19):** Original cron used a narrow 48h window to detect "newly expired" subs, which missed expirations if cron didn't fire or window passed. Now uses `churn_removed` table cross-reference — catches everything regardless of timing
4. **Cron not firing (investigated Apr 19):** Vercel cron was registered but showed only 1 hit in 7 days. Hobby plan crons have a "flexible 1-hour window" and may not fire reliably every day. The `churn_removed` cross-reference approach makes this resilient — even if cron misses a day, the next run catches up

### Environment variables (Vercel: 10am-growth)

| Key | Purpose | Required |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API — `sk_live_...` (server-side only, never client-exposed) | Yes |
| `RESEND_API_KEY` | Email notifications via Resend — `re_...` | Yes (for emails) |
| `CRON_SECRET` | Vercel cron auth header (optional, falls back to admin pass) | No |

### Supabase table: `churn_resub_notified`

- **Columns:** `email` (TEXT, PK), `notified_at` (TIMESTAMPTZ, default NOW())
- **RLS:** Enabled. Policy: `USING (true) WITH CHECK (true)`
- **Purpose:** Track which re-subscribers have already been notified via email. Prevents duplicate alerts — each re-sub only triggers one email

### Supabase table: `churn_removed`

- **Columns:** `email` (TEXT, PK), `removed_at` (TIMESTAMPTZ, default NOW()), `removed_by` (TEXT, default 'hernan')
- **RLS:** Enabled. Policy: `USING (true) WITH CHECK (true)` (open for all roles)
- **Purpose:** Persist checkbox state so removed members don't reappear as pending. Also used by cron to know what's already been actioned
- **Read by:** `/api/churn-removed` (GET) and `/api/cron/churn-notify.js`
- **Written by:** `/api/churn-removed` (POST) when user checks/unchecks on dashboard

### Files

| File | Purpose |
|---|---|
| `api/churn.js` | Stripe subscriber status API — returns all 5 tabs of data (password-gated) |
| `api/churn-removed.js` | Supabase CRUD for removed checkmarks (GET list, POST toggle) |
| `api/cron/churn-notify.js` | Daily email cron — checks Stripe, cross-refs churn_removed, sends via Resend |
| `src/app/admin/churn/page.js` | Frontend dashboard — password gate, 5 tabs, checkboxes, search, mobile responsive |
| `vercel.json` | Cron schedule: `"0 13 * * *"` (8 AM COT daily) |

### Stripe API details

- **Key location:** Vercel env var `STRIPE_SECRET_KEY`
- **API version pinned:** `2023-10-16` (via `Stripe-Version` header on every request)
- **Endpoints used:**
  - `GET /v1/subscriptions?status=canceled&expand[]=data.customer` (paginated, 100/page)
  - `GET /v1/subscriptions?status=past_due&expand[]=data.customer`
  - `GET /v1/subscriptions?status=active&expand[]=data.customer` (for re-sub detection)
- **Key fields used:** `customer.email`, `canceled_at`, `current_period_end`, `items.data[0].price.unit_amount`, `currency`
- **Annual detection:** `unit_amount >= 30000` ($300+ = annual plan)

### Workflow for Hernán

1. **Monthly:** Open `growth.10am.pro/admin/churn`, work through REMOVE tab, check off members as you remove them from Alpha WhatsApp
2. **Daily (automated):** Cron runs at 8 AM COT, emails you if there's anyone to remove that you haven't checked off
3. **When Substack sends "payment failed" email:** The person will show up in RECENT tab. Wait for their `periodEnd` to pass — then they move to REMOVE and the cron emails you
4. **Annual subs:** They stay in STILL ACTIVE with a countdown. When the year is up, they move to REMOVE automatically

---

## 🛒 Gumroad Cleanup System (added April 29, 2026)

### Why it exists

**Empirically confirmed Apr 29:** Gumroad subscriptions do NOT flow into the Stripe account, despite Gumroad being "connected" to Stripe via `acct_2CdwT0BlwpG9wBEhLoxH` in payout settings. Cross-reference test: 1 of 58 canceled-Gumroad emails appeared in Stripe canceled — and that 1 (`juandaospina25@gmail.com`) was a coincidence (user paid both platforms simultaneously, then migrated). The Stripe Connect account on Gumroad is for *payouts*, not subscription mirroring.

**Implication:** `/api/churn` cannot detect Gumroad cancellations. They are completely invisible to the existing Stripe-based churn dashboard.

**Strategic decision (Apr 29):** Sunset Gumroad organically — let it degrade. All new sales go through Substack (every podcast episode + 10am.pro funnel points there). No active migration push. Manage decay manually with the dashboard tab built today.

### Architecture

| Piece | Purpose |
|---|---|
| `gumroad_to_remove` (Supabase) | Manual cleanup tracking table — separate from `churn_removed` |
| `/api/churn-removed?table=gumroad` | Multi-table router on existing endpoint (CRUCIAL: do NOT create new files in `/api/`, see Hard-Won Lessons below) |
| GUMROAD tab in `/admin/churn/page.js` | Checkbox UI, persists state across sessions, mobile responsive |
| `supabase-gumroad-cleanup-schema.sql` | Schema + initial seed of 48 expired users from Apr 29 batch |

### Supabase table: `gumroad_to_remove`

- **Columns:** `email` (TEXT, PK), `expired_date` (DATE), `removed_at` (TIMESTAMPTZ, nullable), `removed_by` (TEXT, nullable), `notes` (TEXT, nullable), `created_at` (TIMESTAMPTZ, default NOW())
- **RLS:** Enabled. Policy: `open_all` USING (true) WITH CHECK (true)
- **Purpose:** Track which Gumroad-expired users have been manually removed from Alpha WhatsApp + Substack
- **Read by:** `/api/churn-removed?table=gumroad` (GET)
- **Written by:** `/api/churn-removed?table=gumroad` (POST) when checkbox toggled

### Determining who to remove (the verified workflow)

The naive "check Gumroad CSV cancellations" approach has a **critical false positive risk**: users migrate from Gumroad to Substack (3 cases detected on Apr 29 = ~6% of expired Gumroad users). Removing them from WhatsApp would expel paying customers. **Always cross-reference.**

**Correct algorithm:**
1. Parse Gumroad sales CSV. Filter to `Item Name = "10amalpha chat"` (recurring subs only — exclude one-shot products like "Portafolio" or "Dieta de Información")
2. For each unique email, take latest row (by Purchase Date)
3. Compute status:
   - Has `Cancellation Date` AND `Subscription End Date <= today` → expired
   - Has `Access Revoked? = 1` → expired
   - `Refunded? = 1` or `Fully Refunded? = 1` → refunded (verify removal separately)
   - Has `Cancellation Date` but `Subscription End Date > today` → still in prepaid period, leave
   - Else → active, leave
4. **CRITICAL CROSS-REFERENCE:** Hit `/api/churn?pass=elgordo&listactive=1` to get all active Stripe emails. Subtract that set from the expired list. Anyone in both = migrated, leave them in chat.

The `?listactive=1` debug mode on `/api/churn` was added Apr 29 specifically for this cross-reference. Returns `{count, emails: [sorted array]}`.

### Monthly playbook (manual until automated)

**Cadence:** First week of each month. ~10 min if done on schedule.

1. **Hernán:** Export Gumroad sales CSV covering the period (e.g., last 90 days, or year-to-date for full safety)
2. **Hernán:** Forward all Gumroad cancellation emails to Claude (the email push notification is the canonical signal — see "On the horizon" for automation plan)
3. **Claude:** Cross-reference against current `gumroad_to_remove` table to dedupe (don't re-add already-tracked emails)
4. **Claude:** Cross-reference against Stripe active emails (`?listactive=1`) to filter out migrators
5. **Claude:** Run INSERT with `ON CONFLICT (email) DO NOTHING` on `gumroad_to_remove` for new entries
6. **Hernán:** Open `/admin/churn` → GUMROAD tab → check off as removed from WhatsApp + Substack

### Apr 29 cleanup result

- Cross-referenced 2 Gumroad CSVs (Jan 2025 → Apr 2026, 1,308 transaction rows)
- 209 unique Gumroad buyers, 204 of those subscribed to "10amalpha chat"
- Status breakdown: 148 active, 3 in prepaid period (still active), 51 expired, 2 refunded
- After Stripe-active cross-reference: **3 false positives caught** (`juandaospina25`, `jorgemariobeuth`, `silviamargaritaalvarez` — all migrated to Substack, kept in chat)
- **Final clean removal list: 48 users** — seeded into `gumroad_to_remove`
- Hernán manually verified and removed all 48 from WhatsApp + Substack on Apr 29 (some had been removed previously in ad-hoc cleanups)

### Sunset trajectory

148 active Gumroad subs as of Apr 29. Expected decay: organic churn rate similar to Substack monthly (~10-12%/mo extrapolated). Estimated timeline to <10 active Gumroad subs: 12-18 months. No hard cutoff date set.

### On the horizon — webhook automation (deferred)

Each Gumroad cancellation generates a push notification email to `info@10am.pro` with format:

```
Subject: A subscription has been canceled.
From: Gumroad
Body: Your customer ([email]) has elected to cancel their subscription
to 10amalpha chat. They will no longer be charged. Please note that they
will continue to receive any posts you send to subscribers until the end
of their billing cycle ([date]).
```

This email contains all data needed to auto-populate `gumroad_to_remove`. Two implementation paths considered Apr 29:

**Path A (recommended when ready): Resend inbound webhook**
- Verify `10am.pro` domain in Resend (already pending from April for the from-address upgrade)
- Create inbound route `gumroad@10am.pro` → POST to `/api/churn-removed?table=gumroad&source=email-webhook`
- Gmail filter: from `noreply@gumroad.com` AND subject contains "subscription has been canceled" → forward to `gumroad@10am.pro`
- Extend `/api/churn-removed.js` to parse email body via regex (extract email + billing end date)
- Effort: ~30 min once domain verified

**Path B: Gmail watcher cron**
- Every hour, hit Gmail API for unread Gumroad cancellation emails
- Parse + insert into table + mark email read
- Effort: ~1h, but more fragile (depends on Gmail filtering not breaking)

**Decision:** Both deferred Apr 29. Hernán prefers manual email-driven workflow for now. Revisit if monthly volume becomes annoying or if a re-cleanup becomes needed.

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
| `api/cron/ig-boost-notify.js` | **Email alert cron** — Mon+Thu 13:00 UTC. Calls `/api/ig-boost-live`, filters by threshold+age+cooldown+tracking, sends Resend email to `info@10am.pro` if candidates found |
| `src/app/IgBoostTab.jsx` | Frontend: Top 3 cards + candidates table + CAC-first tracking history |
| `supabase-ig-boost-schema.sql` | Initial schema for `ig_boost_tracking` table |
| `supabase-ig-boost-migration-1.sql` | Adds baseline metric columns + `paid_subs_attributed`, `mrr_attributed` |
| `supabase-ig-boost-alerts-schema.sql` | `ig_boost_alerts_sent` table — anti-spam cooldown for email alerts |

### Scoring formula (v2 — Apr 28 2026)

```
score = ((shares_per_1k × 4) + (saves_per_1k × 3) + (comments_per_1k × 2) + (engagement_rate × 8))
        × freshness_multiplier
        
freshness_multiplier = 1.5 if reel < 24h old, 1.25 if < 72h, else 1.0
```

**Why these signals (aligned with the boost → URL → email funnel):**
- **Shares/1K (×4)** — strongest leave-platform intent. Closest organic behavior to clicking out of IG to a Substack URL.
- **Saves/1K (×3)** — return-intent / depth. User wants to come back to this content, signals willingness to engage further.
- **Comments/1K (×2)** — active attention, but ambiguous direction. Useful but not over-weighted.
- **ER (×8)** — Meta's paid algorithm uses ER to set CPM. Higher ER = cheaper boost = more emails per $. This is a *cost* signal, not a conversion signal.
- **Freshness multiplier** — recent reels still have algorithmic momentum on Meta's organic feed. Boost capitalizes on that signal.

**Filter chain:**
- Reels only (`media_product_type === "REELS"` OR `media_type === "VIDEO"`)
- Published within last 28 days
- Views ≤ 3× median (excludes already-burned virals — boosting an org-viral wastes $$ delivering to lower-quality cohorts)
- Views ≥ 500 OR age < 72h (fresh reels bypass view floor since they haven't accumulated views yet)

**Why v1 (Apr 18-19) was replaced:**
- v1 used `follows_per_1k × 3` and `profile_visits_per_1k × 1.5` — both metrics return 0 for every reel because Meta token doesn't have `instagram_manage_insights` scope on those specific metrics
- 4.5/16.5 score weight points were dead → score collapsed to mostly ER
- Also wrong funnel: follows/profile visits measure "want more of you on IG" (audience growth), not "will click out and give email"
- v2 drops zero-returning metrics, adds comments (was ignored), reweights to favor click-out signals

**Hypothesis vs ground truth:** v2 is an unproven hypothesis. The next 3-5 boosts will tell us if the weights are right by regressing actual `$/email` against score components. Phase 2 will auto-tune.

**Meta API quirks discovered:**
- `video_duration` field returns 400 on v22.0 — duration is null for all clips, filter relaxed to allow unknown duration
- `views` sometimes comes as 0 — fallback chain: `views` → `ig_reels_aggregated_all_plays_count` → `reach`
- `follows` and `profile_visits` not always returned — handled gracefully (defaults to 0); also why v1 formula was scrapped
- Must use Batch API (50 reels/request) to avoid timeout on `/insights` per-reel

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

### Current boost state (as of Apr 28 2026)

**⚠️ NO ACTIVE ADS. Paused since Apr 21. $0 currently spent on Meta.**

**History — 6 boost attempts logged in `ig_boost_tracking`:**

| ID | Date | Clip | Status | Result |
|---|---|---|---|---|
| 1 | Apr 19 | Donald Trump / Madmen (`e204_usa_abr26`) | rejected | Meta political classifier blocked it. $0 spent. |
| 2 | Apr 19 | Transición energética petróleo (`petroleo_abr26`) | completed | Killed day 3. 2 emails captured. $/email = $21 (4× over target). $98 spent. |
| 3 | Apr 21 | China vs Japón (`china_japon_abr26`) | active *(stale — should be rejected)* | Duplicate of row 6. |
| 4 | Apr 21 | China vs Japón (duplicate) | active *(stale — should be rejected)* | Duplicate of row 6. |
| 5 | Apr 21 | China vs Japón (duplicate) | active *(stale — should be rejected)* | Duplicate of row 6. |
| 6 | Apr 21 | China vs Japón | rejected | Meta political classifier (named country = political ad). $0 spent. |

**Total real spend:** $98 (only `petroleo_abr26` actually delivered).
**Total emails captured:** 2.
**Real $/email so far:** $49 (1 boost only — not statistically meaningful).

**Lessons baked in to v2 formula and political-risk flag:**
- Avoid clips naming political figures (Trump, Petro, Milei, etc.) — Meta auto-blocks
- Avoid clips naming countries in geopolitical conflict context — same classifier
- Topical Substack landing alone isn't enough — `petroleo_abr26` had a perfect match landing and still got $/email $21, suggesting either landing copy or audience targeting needs work too

**Known dirty data to clean up:**
Rows 3, 4, 5 are duplicate inserts of the same `china_japon_abr26` boost (POST endpoint has no idempotency guard — rapid double-clicks created them). Row 6 has the correct `rejected` status. Action item: PATCH rows 3, 4, 5 to `status='rejected'` matching row 6, or add a UNIQUE constraint on `(media_id, utm_campaign)` and clean up.

### Benchmarks (target ranges)

| Metric | Target | Alert threshold |
|---|---|---|
| $/email | < $5 | > $10 |
| $/paid sub | < $80 (≈ 10mo payback at $8/mo) | > $150 |

**Decision rule:** If $/email > $15 or $/paid > $150 across 3+ boosts, pause IG boost strategy. Data says: reconsider channel or landing strategy before scaling.

### Email Alert System (Apr 19 2026)

**Goal:** Proactive push — get emailed when a reel hits boost-worthy signals, instead of pulling the tab manually.

**How it works (plain language):**

Cron fires Mon+Thu at 13:00 UTC → calls `/api/ig-boost-live` (same endpoint the tab uses) → filters to candidates worth alerting about → sends one email with all of them → records that they've been alerted (so it doesn't spam).

**Filter chain (a reel must pass all 5):**

1. `score >= 50` (the scoring formula from main feature — saves/follows/profile-visits/ER weighted)
2. `published_at` within last 30 days (fresher reels boost better)
3. Not in `ig_boost_tracking` with `status = rejected` (already tried and blocked by Meta)
4. Not in `ig_boost_tracking` at all (already boosted, no reason to alert)
5. Not in `ig_boost_alerts_sent` within last 7 days (cooldown — same reel won't spam inbox)

If zero candidates pass → cron completes silently, no email. Only emails when there's something actionable.

**Email contents (matches `/admin/churn` aesthetic — dark, mono, accent verde):**

- Header with candidate count
- Per candidate: rank, age in days, score badge, caption, 4-metric grid (Views / ER / Saves-1K / Shares), scoring reasoning, topical landing match (if Substack post matches), **political risk flag** (regex on caption for Trump/Petro/Milei/elecciones/etc — auto-warns about Meta classifier based on the Madmen rejection)
- Two CTAs per candidate: `Ver reel ↗` (pink) + `Configurar boost →` (green) both deep-link to existing flows

**Anti-spam cooldown:**

`ig_boost_alerts_sent` table records `media_id`, `score`, `reel_age_days`, `notes`, timestamp. Query filters candidates against alerts from last 7 days. So a reel with score 52 alerted Monday won't re-alert Thursday even if still qualifying — but if its score climbs above 50 after Monday+7 it can re-appear (matches requirement of 1-week-re-consideration).

**Reuses from existing infra:**

- Same `RESEND_API_KEY` env var as churn-notify
- Same sender (`onboarding@resend.dev`)
- Same recipient (`info@10am.pro`)
- Same auth pattern (cron secret or `?pass=elgordo` for manual trigger)
- Same HTML aesthetic (Helvetica + dark bg + verde/oro accents matching the brand palette)
- Reuses `/api/ig-boost-live` for scoring (single source of truth — no duplicate scoring code)
- Reuses `/api/substack-posts` for topical landing match

**Why this matters for the business:**

Going from pull to push. The tab requires you to remember to check; the cron guarantees no high-score reel within its 30-day window goes unseen. Also surfaces the political risk flag *before* you spend time setting up a boost that Meta will reject — learning captured from the Madmen rejection on Apr 19.

### Phase 2 — future improvements

- **Upload Substack sources CSV** in the tab → auto-match by `utm_campaign` → fills `emails_attributed` without manual entry
- **Stripe cross-reference** for automatic `paid_subs_attributed` (match emails captured → Stripe customers created post-boost date)
- **Extend to TikTok** via TikTok Research API (when approved)
- **Extend to YouTube Shorts** via YT Data API (already have key)
- **Auto-tune scoring weights** by regressing historical CAC outcomes against score components
- **Claude API topical matching** to replace keyword overlap (will handle synonyms, broader topical semantic match)

---

## ✨ FRESH PICKS Section (May 1, 2026)

**Goal:** Solve the recurring "no veo los reels nuevos" problem. The main top-10 ranking is biased toward older reels that have had time to accumulate shares/saves — a reel published 1h ago can't win on absolute counts. Fresh Picks gives recent reels their own dedicated visibility section, evaluated on signals that are meaningful at their age (velocity, ER, early intent).

### Architecture

Reuses `/api/ig-boost-live` — added a `fresh_picks` array to the response alongside the existing `recommendations`. Single endpoint call, no extra fetch, no new file (Vercel routing issues).

### Filter logic

Reel qualifies for Fresh Picks if ALL:
- `age_hours < 72`
- ANY of: `engagement_rate >= 3%` OR `velocity >= 50 views/h` OR `saves > 0` OR `shares > 0`

Sorted by `published_at DESC` (most recent first), not by score — chronological flow is the point.

### Standardized metrics grid (always 4 cells, same order, same benchmarks)

Every Fresh Pick shows the same 4 metrics with traffic-light status, so reels are visually comparable column-by-column:

| Metric | ✓ alta | — ok | ✗ debajo |
|---|---|---|---|
| Velocity (views/h) | ≥100 | ≥30 | <30 |
| ER (engagement rate %) | ≥4% | ≥2.5% | <2.5% |
| Saves | ≥5 | ≥1 | 0 |
| Shares | ≥5 | ≥1 | 0 |

Hover any cell shows the benchmark in tooltip. Color: green border for ✓, red border for ✗, neutral for —.

### API response shape (additions)

```json
{
  "recommendations": [...],
  "fresh_picks": [
    {
      "media_id": "...",
      "permalink": "...",
      "caption": "...",
      "age_hours": 1.5,
      "views": 837,
      "velocity_per_hour": 543.8,
      "engagement_rate": 1.67,
      "saves": 0,
      "shares": 0,
      "metrics_grid": [
        { "label": "Velocity", "value": "544 v/h", "status": "✓", "benchmark": "≥100 alta · ≥30 ok" },
        { "label": "ER", "value": "1.7%", "status": "✗", "benchmark": "≥4% alta · ≥2.5% ok" },
        { "label": "Saves", "value": "0", "status": "✗", "benchmark": "≥5 alta · ≥1 ok" },
        { "label": "Shares", "value": "0", "status": "✗", "benchmark": "≥5 alta · ≥1 ok" }
      ]
    }
  ],
  "fresh_count": 3
}
```

### UI placement

Renders ABOVE the top-10 recommendations, in a gold-bordered container (`rgba(212,168,67,0.2)` border, `rgba(212,168,67,0.04)` bg) to distinguish from the main green recommendations.

### Why this matters

The top-10 ranking is "qué boostear con confianza" (proven performers). Fresh Picks is "qué está saliendo nuevo" (early signals). Together they answer two different operational questions without one cannibalizing the other.

A reel that graduates from Fresh Picks (after 72h) flows naturally into the top-10 competition. Nothing is lost.

### Debug endpoints (always available — never get blindsided again)

- `GET /api/ig-boost-live?debug=raw` — most recent 30 posts from Meta with `age_hours`, no filters, no scoring. Use to verify Meta API is returning fresh data.
- `GET /api/ig-boost-live?raw=1` — all reels (post-filter for VIDEO/REELS, post-insights), sorted newest first, includes views/likes/saves/shares/ER. Use to inspect what scoring sees BEFORE ranking.

### Hard-won lesson — VERCEL HATES NEW FILES

**Tried first:** Created `/api/ig-debug-feed.js` as separate endpoint. Got 404 with `last-modified: 34 hours ago` — Vercel didn't deploy the new file route. Same pattern caught earlier with the Gumroad churn endpoint.

**Workaround pattern:** Always extend an existing endpoint with a query param (`?debug=raw`, `?raw=1`) instead of creating new `/api/*.js` files. New files frequently fail to register routes after deploy. Modifications to existing files always work.

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

---

## Validation Plan — When Hernán Uploads Substack Growth CSV

**Trigger:** Hernán uploads Substack subscriber export with `utm_source`, `utm_campaign`, `utm_medium` columns.

**Process:**
1. Filter rows where `utm_medium = "boost"`
2. Group by `utm_campaign` (each campaign = one boost from `ig_boost_tracking`)
3. JOIN against `ig_boost_tracking.utm_campaign` to get budget + score components
4. Compute real `$/email` per boost
5. Regress `$/email` against `shares_per_1k`, `saves_per_1k`, `comments_per_1k`, `engagement_rate`
6. Compare regression coefficients to v2 weights (4, 3, 2, 8 respectively)
7. Retune weights if reality diverges meaningfully from formula

**Why this matters:** v2 formula (Apr 28) is a hypothesis. The first 5+ boosts that survive Meta + capture emails are the ground truth that validates or invalidates it. Without this loop, the formula stays unproven indefinitely.

---

## Session Log

### Apr 29, 2026 — Gumroad cleanup system + lessons relearned

**What triggered this:** Hernán started receiving Gumroad cancellation emails and asked whether the existing churn dashboard was catching them. Answer: it wasn't — see Gumroad Cleanup System section above for full architecture.

**What got built:**
- New Supabase table `gumroad_to_remove` + initial seed of 48 expired users
- New GUMROAD tab in `/admin/churn` with checkbox UI, persists state
- `/api/churn-removed` extended via `?table=gumroad` query param to handle both tables
- New `?listactive=1` debug mode on `/api/churn` — returns all active Stripe emails for cross-reference
- New SUBSTACK/GUMROAD source badges on every row in the existing 5 churn tabs (badge derived from `priceMetadata.substack === "yes"`)

**What got verified empirically:**
- Gumroad and Stripe are independent systems despite being "connected" via Stripe Connect for payouts. Cross-ref result: 1 of 58 canceled-Gumroad emails in Stripe canceled list (and that 1 was a coincidence).
- Migration Gumroad → Substack happens organically. Detected 3 cases (~6% of expired Gumroad users) where the same user had an active Substack sub. Removing them based on Gumroad expiry alone would have been a false positive.
- The 48 final removals took ~30 min of manual WhatsApp + Substack cleanup; some had been ad-hoc-removed previously.

**Hard-won lessons (don't relearn):**
- **Adding new files to `/api/` reliably breaks Vercel builds.** Happened 4th time today (after 3 prior incidents documented in Apr 28 session log). Created `/api/gumroad-cleanup.js` → ERROR on deploy. Deleted it, merged logic into existing `/api/churn-removed.js` via `?table=` query param → built fine. **Going forward: NEVER create new files in `/api/`. Always extend existing endpoints with query params or path discriminators.** Root cause still unknown; possibly Vercel build cache or function-detection hashing.
- **Build passes locally != build passes on Vercel.** `npx next build` succeeded both times new files were added; Vercel ERROR'd both times. Local build is necessary but not sufficient.
- **Sed `\&` escaping is fine inside JS template literals.** Initially worried about it — verified via `cat -A` that the literal `&` was preserved correctly in the URL string. Not a bug source.
- **`useEffect` auto-restore from sessionStorage is its own code path.** Added `fetchGumroad(pass)` only to `handleUnlock`, forgot the auto-restore useEffect. Result: tab loaded "Loading…" forever for users with cached pass. Fix: every fetch helper that runs on unlock must also run on auto-restore. Search for ALL occurrences when adding a new fetcher.
- **Gumroad CSV export ≠ membership state.** Sales CSV is transaction history. A user can have `Cancellation Date` set 6 months ago but be currently re-subscribed if they came back. Always group by email → take latest row → derive status. Don't filter on "has cancellation" alone.
- **Always cross-reference before destructive ops.** The 3-user false-positive catch (migrators) saved expelling paying customers. Any cleanup based on one system's data must verify against the other system before action.
- **Supabase SQL editor truncates large pastes silently.** First attempt of the seed SQL failed with "syntax error at end of input LINE 0" — Hernán pasted ~80 lines and the editor cut off mid-INSERT. Workaround: split into 3 blocks (CREATE, POLICY, INSERT) and run sequentially. Going forward: any SQL > 50 lines goes in 2-3 blocks.

**Strategic outcome:**
- Gumroad sunset confirmed (every funnel — podcast, 10am.pro, social — points to Substack only). Let it degrade organically, no migration push.
- Estimated timeline to < 10 active Gumroad subs: 12-18 months
- Webhook automation (Resend inbound) deferred. Manual monthly playbook is acceptable for the volume.

---

### Apr 28, 2026 — IG Boost system audit + v2 formula

**What was wrong:**
- Dashboard showed stale recommendations (top 3 were 7+ days old)
- v1 score formula relied on `follows_per_1k` and `profile_visits_per_1k` — both return 0 from this Meta token (permission scope), so 4.5/16.5 score points were dead → score collapsed to mostly ER
- 4 boosts since Apr 19 — all but one rejected by Meta political classifier
- STATUS doc claimed "Active boost: Donald Trump / Madmen" — actually paused 9 days prior, never updated

**What was fixed:**
- v2 score formula: `(shares×4 + saves×3 + comments×2 + ER×8) × freshness_multiplier`
- Freshness multiplier added: <24h = 1.5×, <72h = 1.25×, else 1× — fresh reels surface in Top 3
- Reasoning chips updated to mention shares/saves/comments instead of follows/profile_visits
- STATUS doc now reflects no-active-ads reality + dirty data items

**Hard-won lessons (don't relearn):**
- **Editing existing API files works on Vercel; adding new files keeps causing build ERROR** (root cause unknown — happened 3x in this session). Workaround: extend existing endpoints with `?raw=1` or `?mode=` query params instead of creating new debug files.
- **Vercel MCP plugin (5 tools) doesn't expose build logs, cron registration, or settings.** When deploys fail or you need cron status, MCP is blind. Workarounds: (a) Vercel API token in env var + server-side admin endpoint, OR (b) just edit existing endpoints to expose what you need.
- **`api.vercel.com` is blocked from this container's bash allowlist** — even with a valid Vercel API token, direct curl returns 403. To call Vercel API from Claude, the call must run from a Vercel function (server-side endpoint), not from bash.
- **Don't blame a filter without checking the data.** I claimed the 500-view filter was hiding fresh reels — but every reel in the dataset had ≥1,124 views. Real cause: top-10-by-score sorting + dead score weights + no freshness boost. Always verify the filter is actually filtering before claiming it.
- **`follows` and `profile_visits` return 0 for every reel** with current Meta token scope. Don't weight them in any future scoring. If permission ever gets fixed, then reconsider.
- **POST `/api/ig-boost-tracking` has no idempotency guard** — rapid double-clicks create duplicate rows. Already polluted production data (rows 3, 4, 5 are dupes of `china_japon_abr26`). Fix: UNIQUE constraint on `(media_id, utm_campaign)` or 5-min window check in handler.
- **Cron handler works correctly when invoked manually** (`?pass=elgordo`) — uncertainty is whether Vercel scheduler is firing it on Mon+Thu schedule. Vercel MCP can't show this; would need API access (blocked) or Vercel Dashboard → Crons tab.
