/**
 * Telegram notification template rendering.
 * Templates use {placeholder} syntax. Unknown placeholders are left as-is.
 */

export type TemplateEvent =
  | "on_click"
  | "digest_hourly"
  | "digest_daily"
  | "digest_minutes"
  | "low_balance"
  | "new_topup"
  | "milestone"
  | "link_expired";

export interface ClickEventData {
  link_slug: string;
  link_title: string;
  link_url: string;
  destination: string;
  country: string;
  region: string;
  city: string;
  os: string;
  browser: string;
  device: string;
  referrer: string;
  is_unique: string | boolean;
  is_bot: string | boolean;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  language: string;
  ip_hash: string;
  total_clicks: number;
}

export interface DigestEventData {
  period: string;
  total: number;
  unique: number;
  top_country: string;
  top_os: string;
  top_link: string;
}

export interface TopupEventData {
  amount: string;
  credits: string;
  currency: string;
  new_balance: string;
}

export interface LowBalanceEventData {
  balance: string;
  threshold: string;
}

export type EventData = Partial<
  ClickEventData & DigestEventData & TopupEventData & LowBalanceEventData
> & { [k: string]: string | number | boolean | undefined };

export function renderTemplate(template: string, data: EventData): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const v = data[key];
    if (v === undefined || v === null) return `{${key}}`;
    return String(v);
  });
}

export const DEFAULT_TEMPLATES: Record<TemplateEvent, string> = {
  on_click: `🎯 <b>Click</b>
🔗 <code>{link_slug}</code> → {destination}
🌍 {country} · 💻 {os} ({browser})
👤 {is_unique} · 📊 Total: {total_clicks}`,
  digest_hourly: `📊 <b>Hourly digest</b>
🕐 {period}
👁 Clicks: {total} ({unique} unique)
🌍 Top country: {top_country}
💻 Top OS: {top_os}
🔗 Top link: {top_link}`,
  digest_daily: `📊 <b>Daily digest</b>
📅 {period}
👁 Clicks: {total} ({unique} unique)
🌍 Top country: {top_country}
💻 Top OS: {top_os}
🔗 Top link: {top_link}`,
  digest_minutes: `📊 <b>Recent activity</b>
🕐 {period}
👁 Clicks: {total} ({unique} unique)`,
  low_balance: `⚠️ <b>Low balance</b>
Balance: {balance} (below {threshold})
Top up to keep your links running.`,
  new_topup: `✅ <b>Wallet topped up</b>
Amount: {amount} {currency}
Credits added: {credits}
New balance: {new_balance}`,
  milestone: `🎉 <b>Milestone</b>
{link_slug} reached {total_clicks} clicks!`,
  link_expired: `⏰ <b>Link expired</b>
{link_slug} has stopped redirecting.`,
};
