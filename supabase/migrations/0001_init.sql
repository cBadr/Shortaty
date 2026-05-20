-- ============================================================
-- Shortaty (شورتاتي) — Initial Schema
-- Postgres on Supabase, with Row Level Security
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1) profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text,
  avatar_url            text,
  role                  text not null default 'user' check (role in ('admin', 'user')),
  language              text not null default 'ar' check (language in ('ar', 'en')),
  credits_balance       numeric(18, 6) not null default 0,
  telegram_bot_token    text,
  telegram_chat_id      text,
  telegram_verified     boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- ============================================================
-- 2) domains (admin-managed)
-- ============================================================
create table public.domains (
  id                    uuid primary key default gen_random_uuid(),
  hostname              text not null unique,
  status                text not null default 'pending'
                        check (status in ('pending', 'verifying', 'active', 'error')),
  vercel_domain_id      text,
  vercel_project_id     text,
  dns_configured        boolean not null default false,
  ssl_status            text,
  is_default            boolean not null default false,
  notes                 text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_domains_status on public.domains(status);
create unique index uniq_default_domain
  on public.domains((is_default)) where is_default = true;

-- ============================================================
-- 3) campaigns
-- ============================================================
create table public.campaigns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  name                  text not null,
  description           text,
  color                 text default '#3b82f6',
  tags                  text[] default '{}',
  is_archived           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_campaigns_user on public.campaigns(user_id);

-- ============================================================
-- 4) links
-- ============================================================
create table public.links (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  campaign_id           uuid references public.campaigns(id) on delete set null,
  domain_id             uuid not null references public.domains(id) on delete restrict,
  slug                  text not null,
  title                 text,
  default_destination_url text not null,
  password_hash         text,
  expires_at            timestamptz,
  max_clicks            integer,
  redirect_type         smallint not null default 302 check (redirect_type in (301, 302)),
  is_cloaked            boolean not null default false,
  is_active             boolean not null default true,
  -- Open Graph (for bot preview)
  og_title              text,
  og_description        text,
  og_image              text,
  -- UTM
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_term              text,
  utm_content           text,
  -- Counters
  total_clicks          bigint not null default 0,
  unique_clicks         bigint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (domain_id, slug)
);

create index idx_links_user on public.links(user_id);
create index idx_links_campaign on public.links(campaign_id);
create index idx_links_domain_slug on public.links(domain_id, slug);
create index idx_links_active on public.links(is_active) where is_active = true;

-- ============================================================
-- 5) link_rules (smart targeting)
-- ============================================================
create table public.link_rules (
  id                    uuid primary key default gen_random_uuid(),
  link_id               uuid not null references public.links(id) on delete cascade,
  priority              integer not null default 0,
  name                  text,
  conditions            jsonb not null default '{}'::jsonb,
  destination_url       text not null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index idx_link_rules_link on public.link_rules(link_id, priority);

-- ============================================================
-- 6) clicks (visit log)
-- ============================================================
create table public.clicks (
  id                    bigserial primary key,
  link_id               uuid not null references public.links(id) on delete cascade,
  rule_id               uuid references public.link_rules(id) on delete set null,
  -- Device
  user_agent            text,
  browser               text,
  browser_version       text,
  os                    text,
  os_version            text,
  device_type           text,  -- mobile | tablet | desktop | bot
  device_vendor         text,
  -- Geo
  ip_hash               text,
  country               text,
  region                text,
  city                  text,
  timezone              text,
  -- Source
  referrer              text,
  referrer_domain       text,
  language              text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_term              text,
  utm_content           text,
  -- Detection
  is_bot                boolean not null default false,
  bot_name              text,
  is_vpn                boolean not null default false,
  is_proxy              boolean not null default false,
  -- Result
  destination_url       text,
  status_code           integer,
  is_unique             boolean not null default false,
  visitor_fingerprint   text,
  clicked_at            timestamptz not null default now()
);

create index idx_clicks_link_clicked on public.clicks(link_id, clicked_at desc);
create index idx_clicks_country on public.clicks(country);
create index idx_clicks_os on public.clicks(os);
create index idx_clicks_is_bot on public.clicks(is_bot);

-- ============================================================
-- 7) clicks_daily (rollup for performance)
-- ============================================================
create table public.clicks_daily (
  link_id               uuid not null references public.links(id) on delete cascade,
  day                   date not null,
  country               text not null default '',
  os                    text not null default '',
  device_type           text not null default '',
  total                 bigint not null default 0,
  unique_visitors       bigint not null default 0,
  bots                  bigint not null default 0,
  primary key (link_id, day, country, os, device_type)
);

create index idx_clicks_daily_day on public.clicks_daily(day);

-- ============================================================
-- 8) wallet_transactions
-- ============================================================
create table public.wallet_transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  type                  text not null check (type in ('topup', 'usage', 'refund', 'admin_adjust', 'bonus')),
  amount                numeric(18, 6) not null,
  balance_after         numeric(18, 6) not null,
  reference             text,
  description           text,
  metadata              jsonb default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index idx_wallet_tx_user on public.wallet_transactions(user_id, created_at desc);

-- ============================================================
-- 9) topup_orders (Coinpayments)
-- ============================================================
create table public.topup_orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  amount_usd            numeric(18, 6) not null,
  credits               numeric(18, 6) not null,
  coinpayments_txn_id   text unique,
  currency              text,
  address               text,
  status                text not null default 'pending'
                        check (status in ('pending', 'paid', 'expired', 'cancelled', 'failed')),
  ipn_data              jsonb default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);

create index idx_topup_user on public.topup_orders(user_id, created_at desc);
create index idx_topup_status on public.topup_orders(status);

-- ============================================================
-- 10) telegram_templates
-- ============================================================
create table public.telegram_templates (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  event                 text not null check (event in
                          ('on_click', 'digest_hourly', 'digest_daily', 'digest_minutes',
                           'low_balance', 'new_topup', 'milestone', 'link_expired')),
  template              text not null,
  is_enabled            boolean not null default true,
  throttle_seconds      integer not null default 0,
  filters               jsonb default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, event)
);

-- ============================================================
-- 11) telegram_outbox
-- ============================================================
create table public.telegram_outbox (
  id                    bigserial primary key,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  message               text not null,
  parse_mode            text default 'HTML',
  status                text not null default 'pending'
                        check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts              integer not null default 0,
  last_error            text,
  send_at               timestamptz not null default now(),
  sent_at               timestamptz,
  created_at            timestamptz not null default now()
);

create index idx_outbox_status_send on public.telegram_outbox(status, send_at);

-- ============================================================
-- 12) api_keys
-- ============================================================
create table public.api_keys (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  key_hash              text not null unique,
  prefix                text not null,
  name                  text not null,
  scopes                text[] not null default '{}',
  last_used_at          timestamptz,
  expires_at            timestamptz,
  rate_limit_per_min    integer not null default 60,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index idx_api_keys_user on public.api_keys(user_id);

-- ============================================================
-- 13) audit_logs
-- ============================================================
create table public.audit_logs (
  id                    bigserial primary key,
  user_id               uuid references public.profiles(id) on delete set null,
  action                text not null,
  resource_type         text,
  resource_id           text,
  metadata              jsonb default '{}'::jsonb,
  ip                    text,
  user_agent            text,
  created_at            timestamptz not null default now()
);

create index idx_audit_user on public.audit_logs(user_id, created_at desc);

-- ============================================================
-- 14) system_settings
-- ============================================================
create table public.system_settings (
  key                   text primary key,
  value                 jsonb not null,
  description           text,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles(id) on delete set null
);

-- Seed default settings
insert into public.system_settings (key, value, description) values
  ('cost_per_click', '0.001'::jsonb, 'Credits deducted per click'),
  ('cost_per_link', '0'::jsonb, 'Credits deducted when creating a link'),
  ('cost_per_notification', '0.0005'::jsonb, 'Credits deducted per Telegram notification'),
  ('low_balance_threshold', '1.0'::jsonb, 'Notify user when balance falls below this'),
  ('signup_bonus_credits', '5.0'::jsonb, 'Free credits on signup'),
  ('credits_per_usd', '1000'::jsonb, 'Credits granted per USD topped up')
on conflict (key) do nothing;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_domains_updated_at before update on public.domains
  for each row execute function public.set_updated_at();
create trigger trg_campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger trg_links_updated_at before update on public.links
  for each row execute function public.set_updated_at();
create trigger trg_telegram_templates_updated_at before update on public.telegram_templates
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bonus numeric;
begin
  select (value::text)::numeric into bonus from public.system_settings where key = 'signup_bonus_credits';
  insert into public.profiles (id, email, full_name, avatar_url, credits_balance)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(bonus, 0)
  );
  if coalesce(bonus, 0) > 0 then
    insert into public.wallet_transactions (user_id, type, amount, balance_after, description)
    values (new.id, 'bonus', bonus, bonus, 'Signup bonus');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.domains             enable row level security;
alter table public.campaigns           enable row level security;
alter table public.links               enable row level security;
alter table public.link_rules          enable row level security;
alter table public.clicks              enable row level security;
alter table public.clicks_daily        enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.topup_orders        enable row level security;
alter table public.telegram_templates  enable row level security;
alter table public.telegram_outbox     enable row level security;
alter table public.api_keys            enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.system_settings     enable row level security;

-- Helper: is admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- profiles: user sees/updates own row; admin sees all
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid() or public.is_admin(auth.uid()));
create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin(auth.uid()));

-- domains: everyone authenticated can read active; only admin writes
create policy domains_read_active on public.domains
  for select using (status = 'active' or public.is_admin(auth.uid()));
create policy domains_admin_all on public.domains
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- campaigns: owner only
create policy campaigns_owner_all on public.campaigns
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- links: owner only
create policy links_owner_all on public.links
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- link_rules: via link ownership
create policy link_rules_owner_all on public.link_rules
  for all using (
    exists (select 1 from public.links l where l.id = link_id
            and (l.user_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.links l where l.id = link_id
            and (l.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- clicks: read via link ownership (writes happen via service role)
create policy clicks_owner_select on public.clicks
  for select using (
    exists (select 1 from public.links l where l.id = link_id
            and (l.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- clicks_daily: same
create policy clicks_daily_owner_select on public.clicks_daily
  for select using (
    exists (select 1 from public.links l where l.id = link_id
            and (l.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- wallet_transactions: owner read-only (writes via service role)
create policy wallet_owner_select on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- topup_orders: owner read; service role writes
create policy topup_owner_select on public.topup_orders
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy topup_owner_insert on public.topup_orders
  for insert with check (user_id = auth.uid());

-- telegram_templates: owner
create policy telegram_templates_owner_all on public.telegram_templates
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- telegram_outbox: owner read
create policy telegram_outbox_owner_select on public.telegram_outbox
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- api_keys: owner
create policy api_keys_owner_all on public.api_keys
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- audit_logs: owner read; admin read all
create policy audit_owner_select on public.audit_logs
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- system_settings: read for authenticated; write admin only
create policy settings_authenticated_read on public.system_settings
  for select using (auth.role() = 'authenticated');
create policy settings_admin_write on public.system_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
