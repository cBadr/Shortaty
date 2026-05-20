# Shortaty (شورتاتي)

> Smart multi-domain URL shortener for marketers — built with Next.js 15, Supabase, and deployed on Vercel.

**Domain**: [shortaty.com](https://shortaty.com)

---

## Highlights

- **Multi-domain** — admin adds any custom domain via Vercel API + automatic DNS verification.
- **Smart targeting** — first-match rules over OS / device / country / language / referrer / UTM / time / visitor type.
- **Pro analytics** — clicks, unique visitors, bot filtering, country/OS/device/referrer breakdowns, CSV export, daily rollups.
- **Telegram notifications** — every user brings their own bot. Per-event template editor (on_click, hourly/daily digest, milestones, low balance, topups, link expired).
- **Wallet & Coinpayments** — top up with crypto (USDT TRC20/ERC20, BTC, ETH, LTC, DOGE). Credits auto-deducted per click.
- **REST API** — issue scoped keys (`links:read`, `links:write`, `analytics:read`, `wallet:read`). Endpoints under `/api/v1/*`.
- **Bilingual** — Arabic (RTL) + English (LTR) with `next-intl`, fonts auto-switch per `html[lang]`.
- **SEO** — bot-preview pages with OG/Twitter meta, `sitemap.xml`, `robots.txt`, locale-aware alternates.
- **Admin panel** — users, transactions, domains, system settings, audit log.

---

## Setup

### 1) Prerequisites

- Node.js 22+ and npm 11+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) project (for multi-domain via Vercel API)
- A [Coinpayments.net](https://www.coinpayments.net) merchant account
- One or more Telegram bot tokens (per user — via [@BotFather](https://t.me/BotFather))

### 2) Install

```bash
npm install
cp .env.example .env.local
# Fill in the real values in .env.local
```

### 3) Database

Run the migrations against your Supabase project in order:

```bash
# Or paste each file's contents into the Supabase SQL editor in order.
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_link_functions.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_rollup.sql
```

After signing up, promote yourself to admin manually:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 4) Run locally

```bash
npm run dev
```

App is at [http://localhost:3000](http://localhost:3000).

### 5) Deploy to Vercel

```bash
vercel link
vercel --prod
```

Add the env vars from `.env.example` in the Vercel dashboard (Settings → Environment Variables). The cron jobs in `vercel.json` are picked up automatically.

---

## Environment variables

See `.env.example`. The required ones:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://shortaty.com` |
| `ENCRYPTION_KEY` | 32-byte hex string — used to encrypt user Telegram tokens at rest |
| `CRON_SECRET` | Random string — protects `/api/cron/*` endpoints |
| `VERCEL_API_TOKEN` | For domain management |
| `VERCEL_PROJECT_ID` | Target project for domain registration |
| `VERCEL_TEAM_ID` | Optional, if project lives under a team |
| `COINPAYMENTS_PUBLIC_KEY` | Wallet topups |
| `COINPAYMENTS_PRIVATE_KEY` | Wallet topups |
| `COINPAYMENTS_IPN_SECRET` | IPN HMAC verification |
| `COINPAYMENTS_MERCHANT_ID` | Optional sanity check |

Generate `ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Cron jobs (Vercel)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/telegram-outbox` | `* * * * *` | Flush queued Telegram messages |
| `/api/cron/telegram-digest?period=hourly` | `5 * * * *` | Hourly digest per user |
| `/api/cron/telegram-digest?period=daily` | `10 0 * * *` | Daily digest per user |
| `/api/cron/analytics-rollup` | `15 * * * *` | Rebuild `clicks_daily` |
| `/api/cron/dns-verify` | `*/5 * * * *` | Check pending domain DNS |
| `/api/cron/low-balance` | `30 * * * *` | Low-balance alerts |

All require `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends this automatically when you set the env var.

---

## Public API

Authenticate with `Authorization: Bearer sk_live_...`.

```bash
# Create a link
curl -X POST https://shortaty.com/api/v1/links \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"destination_url":"https://example.com","domain":"go.shortaty.com"}'

# Update a link
curl -X PATCH https://shortaty.com/api/v1/links/<id> \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"is_active":false}'

# Wallet balance
curl https://shortaty.com/api/v1/wallet/balance -H "Authorization: Bearer $KEY"
```

---

## Stack

- **Next.js 15** (App Router, Turbopack, Edge Middleware)
- **TypeScript** (strict)
- **Tailwind v4**
- **Supabase** (Postgres + RLS + Auth + Storage)
- **next-intl** (i18n with RTL/LTR auto-switching)
- **Recharts** (analytics)
- **ua-parser-js** + custom bot detection
- **Vercel** (hosting + Edge + Cron + domain API)
- **Coinpayments.net** (crypto wallet topups)

---

## Project structure

```
src/
├─ app/
│  ├─ [locale]/             # i18n root (ar / en)
│  │  ├─ (marketing)/       # public pages
│  │  ├─ (auth)/            # login/register
│  │  ├─ dashboard/         # user app (links, analytics, wallet, telegram, api-keys)
│  │  └─ admin/             # admin tools (domains, users, transactions, settings)
│  ├─ api/
│  │  ├─ r/[slug]/          # ⚡ Edge redirect engine
│  │  ├─ v1/                # Public REST API (bearer-token)
│  │  ├─ webhooks/          # Coinpayments IPN, Telegram bot webhook
│  │  ├─ wallet/topup/      # Wallet topup endpoint
│  │  ├─ analytics/export/  # CSV export
│  │  ├─ cron/              # Scheduled jobs
│  │  └─ auth/callback/     # Supabase OAuth code exchange
│  ├─ robots.ts
│  └─ sitemap.ts
├─ lib/
│  ├─ supabase/             # browser, server, admin clients
│  ├─ targeting/            # device, geo, bot, visitor, rules-engine
│  ├─ telegram/             # client, templates, enqueue
│  ├─ coinpayments/         # client + HMAC verifier
│  ├─ vercel/               # domain API wrapper
│  ├─ analytics/queries.ts
│  ├─ api-auth.ts           # withApiAuth wrapper
│  ├─ api-keys.ts           # key gen + hashing
│  ├─ crypto.ts             # AES-GCM at-rest encryption
│  └─ slug.ts
├─ components/
├─ i18n/                    # routing, request, navigation
├─ types/
└─ middleware.ts            # locale + multi-domain routing
```

---

## Development status

See `PROGRESS.md` for the phase-by-phase build log. All 8 phases complete.

## License

Proprietary — © Shortaty.
