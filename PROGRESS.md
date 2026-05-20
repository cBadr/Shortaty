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

## Phase Roadmap Overview

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation (Next.js, Supabase, i18n, Auth) | ✅ Complete |
| 2 | Link Engine (redirect + targeting + clicks) | ✅ Complete |
| 3 | Analytics Dashboard | ⏳ Next |
| 4 | Multi-Domain Management (Vercel API) | ⏳ Pending |
| 5 | Telegram Notifications (per-user bots) | ⏳ Pending |
| 6 | Wallet & Coinpayments | ⏳ Pending |
| 7 | API + Admin Panel | ⏳ Pending |
| 8 | Polish, SEO, Deploy | ⏳ Pending |

Reference: full plan at `C:/Users/Badr/.claude/plans/elegant-roaming-salamander.md`
