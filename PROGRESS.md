# Shortaty (شورتاتي) — Build Progress

> Status of phased implementation. Updated at the end of each phase.

---

## ✅ Phase 1 — Foundation (Complete)

**Goal**: Bootstrap a Next.js 15 + Supabase + i18n project with auth scaffolding.

### What was built
- **Project bootstrap**: Next.js 15.1.6 (App Router, Turbopack), TypeScript strict, Tailwind v4, ESLint flat config.
- **i18n (next-intl 3.26)**: `ar` (RTL) + `en` (LTR) with automatic `dir`/`lang` HTML attribute switching, locale-aware navigation, locale-prefixed URLs (`/ar/...`, `/en/...`).
- **Fonts**: Cairo + Tajawal for Arabic, Inter for English (auto-applied via `html[lang]`).
- **Theme system**: Light/Dark/System with localStorage persistence.
- **Branding**: Hero, features grid, top navigation with locale & theme toggles.
- **Supabase clients**: Browser (`src/lib/supabase/client.ts`), SSR Server (`src/lib/supabase/server.ts`), Admin/service-role (`src/lib/supabase/admin.ts`).
- **Database schema** (`supabase/migrations/0001_init.sql`): 14 tables — profiles, domains, campaigns, links, link_rules, clicks, clicks_daily, wallet_transactions, topup_orders, telegram_templates, telegram_outbox, api_keys, audit_logs, system_settings. All with RLS policies, triggers (auto-profile creation, updated_at), and seed `system_settings`.
- **Auth pages**: `/login`, `/register` (Supabase Auth with email/password + Google OAuth button), `/auth/callback` (OAuth code exchange route).
- **Middleware**: Locale routing + multi-domain detection scaffold (rewrites non-primary hosts to `/api/r/[slug]` — to be implemented in Phase 2).
- **Dashboard stub**: `/dashboard` protected route that requires an authenticated session.

### Files of note
- [src/middleware.ts](src/middleware.ts) — locale + multi-domain routing
- [src/i18n/routing.ts](src/i18n/routing.ts) — locale config (dir, flag, name)
- [src/app/[locale]/layout.tsx](src/app/[locale]/layout.tsx) — sets `<html dir lang>` dynamically
- [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — full schema + RLS
- [.env.example](.env.example) — env variable reference

### Verification
- ✅ `npm run typecheck` — passes
- ✅ `npm run build` — passes, 13 static pages prerendered (Arabic + English versions of each)
- ✅ Bundle: middleware 47.4 kB, login page 191 kB First Load JS
- Routes generated: `/ar`, `/en`, `/ar/login`, `/en/login`, `/ar/register`, `/en/register`, `/ar/dashboard`, `/en/dashboard`, `/auth/callback`

### Not yet (deferred to later phases)
- Connecting a real Supabase project (env vars are placeholders)
- Running the migration on a real database
- Telegram OTP login (will be added when Telegram integration is built in Phase 5)
- Live UI testing in a browser (requires real Supabase credentials)

---

## ✅ Phase 2 — Link Engine (Complete)

**Goal**: Implement the core URL shortening + redirect engine with smart targeting.

### What was built

**Targeting library** (`src/lib/targeting/`):
- `device.ts` — UA parsing with `ua-parser-js`, classifies mobile/tablet/desktop and OS family.
- `geo.ts` — extracts country/region/city/timezone from Vercel-injected headers; primary `Accept-Language` tag.
- `bot-detector.ts` — recognises preview crawlers (Telegram, WhatsApp, Facebook, Twitter, LinkedIn, Slack, Discord, Pinterest, Reddit) and search-engine bots (Google, Bing, Yandex, Baidu, etc.), with `isbot` fallback.
- `visitor.ts` — composes the full `VisitorContext` (device + geo + bot + UTM + referrer + language + cookie-based new/returning + SHA-256 fingerprint + hour/weekday in visitor TZ).
- `rules-engine.ts` — evaluates priority-ordered JSON conditions: `os`, `device`, `browser`, `country`, `language`, `referrer_domain`, `utm_*`, `is_bot`, `is_vpn`, `visitor_type`, `weekday`, `time_range`. First match wins; lower `priority` runs first.

**Redirect engine** ([src/app/api/r/[slug]/route.ts](src/app/api/r/[slug]/route.ts)):
- Edge runtime (`runtime = "edge"`).
- Looks up domain by `Host` header, then link by `(domain_id, slug)`.
- Honours `expires_at` and `max_clicks`.
- Builds visitor context, evaluates rules, picks destination, appends per-link UTM params.
- **Bot preview**: returns HTML with OG/Twitter meta (no redirect) so social previews work without burning a redirect.
- **Humans**: `301` or `302` based on `redirect_type`.
- Sets `st_v` HTTP-only cookie on new visitors for "unique visitor" tracking.
- Uses Next.js 15 `after()` to fire-and-forget the click insert, atomic counter increment (`increment_link_clicks` RPC), and credit deduction (`deduct_credits` RPC) — request returns instantly.

**Database** (`supabase/migrations/0002_link_functions.sql`):
- `increment_link_clicks(p_link_id, p_is_unique)` — atomic counter update.
- `deduct_credits(p_user_id, p_amount, ...)` — atomic balance check + transaction insert; returns NULL if insufficient.
- `add_credits(p_user_id, p_amount, p_type, ...)` — wallet topup/bonus/refund/admin adjust.

**Dashboard UI**:
- `/dashboard` home — stats cards (links, clicks, balance, telegram status).
- `/dashboard/links` — list with short URL, destination, total/unique clicks, created date.
- `/dashboard/links/new` — create form with domain picker, slug (auto-gen via nanoid if blank), redirect type, optional UTM and OG/expiry/max-clicks advanced fields.
- `/dashboard/links/[id]` — edit basic fields, see counters, manage targeting rules. Rules UI supports JSON conditions with one-click presets (iOS, Android, Egypt, Mobile-only). Toggle/delete/add rules inline.
- Server actions: `createLink`, `updateLink`, `deleteLink`, `createRule`, `toggleRule`, `deleteRule` with Zod validation + ownership checks.
- Reusable `DashboardSidebar` component with links/campaigns/analytics/wallet/telegram/api-keys/settings sections and conditional admin entry.

### Files of note
- [src/lib/targeting/](src/lib/targeting/) — 5 files, ~350 lines, edge-runtime safe.
- [src/app/api/r/[slug]/route.ts](src/app/api/r/%5Bslug%5D/route.ts) — the core redirect engine.
- [supabase/migrations/0002_link_functions.sql](supabase/migrations/0002_link_functions.sql) — atomic RPC helpers.
- [src/app/[locale]/dashboard/links/](src/app/%5Blocale%5D/dashboard/links/) — full CRUD + rules UI.
- [src/lib/slug.ts](src/lib/slug.ts) — URL-safe slug generator (no `0/O/1/l/I`).

### Verification
- ✅ `npm run typecheck` — passes (after dropping the `<Database>` generic constraint from Supabase clients; the placeholder type is permissive until codegen runs).
- ✅ `npm run build` — passes, 17 pages prerendered, edge function `/api/r/[slug]` bundled, middleware 47.6 kB.

### Deferred / handled in later phases
- Real-time analytics dashboard (Phase 3).
- Domain self-service with Vercel API integration (Phase 4) — for now `/admin/domains` UI is missing and active domains must be inserted manually into the DB during testing.
- VPN/Proxy detection requires external IP intelligence (deferred to Phase 8).

---

## ✅ Phase 3 — Analytics Dashboard (Complete)

**Goal**: Visualize click data with charts, breakdowns, and CSV export.

### What was built
- **Queries library** ([src/lib/analytics/queries.ts](src/lib/analytics/queries.ts)) — `getTotals`, `getTimeseries`, `getBreakdown`, `getRecentClicks`. All scope to the user's own links via explicit `IN` on link IDs (RLS belt-and-braces).
- **Analytics page** ([src/app/[locale]/dashboard/analytics/page.tsx](src/app/%5Blocale%5D/dashboard/analytics/page.tsx)):
  - Time-range pills (24h / 7d / 30d / 90d).
  - 4 stat cards (total / unique / bots / links).
  - Area chart of clicks over time (total + unique).
  - 5 breakdown cards (country, OS, device, browser, referrer) with mini bar visualisation.
  - Recent clicks table (30 rows) with CSV export link.
- **Recharts integration** ([src/components/charts/timeseries.tsx](src/components/charts/timeseries.tsx)) using brand colors.
- **CSV export** ([src/app/api/analytics/export/route.ts](src/app/api/analytics/export/route.ts)) — streams up to 50k rows with proper escaping; user-scoped.
- **Daily rollup** (`supabase/migrations/0003_rollup.sql` + `/api/cron/analytics-rollup`): `rollup_clicks_daily()` rebuilds the last 2 days into `clicks_daily` for fast aggregations. Triggered hourly by Vercel Cron (`vercel.json`).

### Verification
- ✅ `npm run typecheck` — passes
- ✅ `npm run build` — passes, analytics page 102 kB chunk (Recharts is the heaviest dep), CSV/rollup endpoints bundled.

---

## ✅ Phase 4 — Multi-Domain Management (Complete)

**Goal**: Let admin add custom domains; system registers them with Vercel and watches DNS until they go active.

### What was built
- **Vercel API wrapper** ([src/lib/vercel/domains.ts](src/lib/vercel/domains.ts)) — `addDomain`, `getDomain`, `verifyDomain`, `removeDomain`, `dnsInstructionsFor` helper. Handles team-scoped projects via `VERCEL_TEAM_ID`.
- **Admin layout + role guard** ([src/app/[locale]/admin/layout.tsx](src/app/%5Blocale%5D/admin/layout.tsx)) — redirects non-admins to dashboard; loads admin sidebar.
- **Admin domains page** ([src/app/[locale]/admin/domains/](src/app/%5Blocale%5D/admin/domains/)):
  - Table with hostname, status badge (active/verifying/pending/error), default star.
  - Add-domain form with validation regex + "Make default" toggle (ensures only one default).
  - Per-row actions: **Verify** (re-runs Vercel verify), **Refresh** (re-fetches status), **Delete**.
  - DNS instructions footer with apex/subdomain guidance.
- **Server actions** (`actions.ts`) with admin gate on every action.
- **DNS verification cron** ([src/app/api/cron/dns-verify/route.ts](src/app/api/cron/dns-verify/route.ts)) — runs every 5 minutes, picks up `pending|verifying|error` domains, asks Vercel, updates DB. Protected by `CRON_SECRET`.
- **vercel.json** wires both crons (analytics rollup hourly + DNS verify every 5 min).

### Verification
- ✅ `npm run typecheck` — passes
- ✅ `npm run build` — passes, `/admin/domains` and 5 routes prerendered (ar/en), 2 cron endpoints bundled.

---

## ✅ Phase 5 — Telegram Notifications (Complete)

**Goal**: Each user brings their own Telegram bot; site sends per-event notifications (clicks, digests, milestones, alerts) using customisable templates.

### What was built
- **AES-256-GCM crypto** ([src/lib/crypto.ts](src/lib/crypto.ts)) — `encryptSecret`/`decryptSecret`/`shortHash`, Edge-runtime safe via Web Crypto.
- **Telegram client** ([src/lib/telegram/client.ts](src/lib/telegram/client.ts)) — `getMe`, `sendMessage`, `setWebhook`, `deleteWebhook`.
- **Template system** ([src/lib/telegram/templates.ts](src/lib/telegram/templates.ts)) — `renderTemplate({placeholder})` + `DEFAULT_TEMPLATES` for 8 events (on_click, digest_hourly, digest_daily, digest_minutes, low_balance, new_topup, milestone, link_expired).
- **Enqueue helper** ([src/lib/telegram/enqueue.ts](src/lib/telegram/enqueue.ts)) — checks template enabled + throttle, renders, inserts into `telegram_outbox`.
- **User settings page** ([/dashboard/telegram](src/app/%5Blocale%5D/dashboard/telegram/page.tsx)):
  - Bot token input with regex validation; calls `getMe` to verify; stores encrypted; registers webhook automatically.
  - Status banner ("Open your bot and send /start") until chat_id captured.
  - Per-event template editor with enable toggle, on_click throttle, inline save-on-blur.
- **Webhook receiver** ([/api/webhooks/telegram/[hash]](src/app/api/webhooks/telegram/%5Bhash%5D/route.ts)) — handles `/start` (captures chat_id, marks verified, sends welcome) and `/ping`. Matches user by re-hashing decrypted bot tokens.
- **Outbox sender cron** (`/api/cron/telegram-outbox`, every minute) — caches bot tokens per user, exponential-backoff retries up to 5 attempts.
- **Digest cron** (`/api/cron/telegram-digest?period=hourly|daily`) — aggregates the last hour/day of clicks per user with `digest_hourly`/`digest_daily` enabled and queues a summary (total, unique, top country/OS/link).
- **Wired into the redirect engine** — every non-bot click triggers `enqueueNotification(user, "on_click", { ... })` in the `after()` background block.
- **vercel.json crons**: outbox (`* * * * *`), digest hourly (`5 * * * *`), digest daily (`10 0 * * *`).

### Verification
- ✅ `npm run typecheck` — passes (after relaxing `BufferSource` types in crypto for Edge runtime).
- ✅ `npm run build` — passes. 5 Telegram endpoints bundled (outbox, digest, webhook, plus existing crons). `/dashboard/telegram` route at 3.37 kB.

---

## Phase Roadmap Overview

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation (Next.js, Supabase, i18n, Auth) | ✅ Complete |
| 2 | Link Engine (redirect + targeting + clicks) | ✅ Complete |
| 3 | Analytics Dashboard | ✅ Complete |
| 4 | Multi-Domain Management (Vercel API) | ✅ Complete |
| 5 | Telegram Notifications (per-user bots) | ✅ Complete |
| 6 | Wallet & Coinpayments | ⏳ Pending |
| 7 | API + Admin Panel | ⏳ Pending |
| 8 | Polish, SEO, Deploy | ⏳ Pending |

Reference: full plan at `C:/Users/Badr/.claude/plans/elegant-roaming-salamander.md`
