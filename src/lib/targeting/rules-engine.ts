import type { LinkRule, RuleConditions, VisitorContext } from "./types";

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function timeInRange(
  visitor: VisitorContext,
  range: { from: string; to: string }
): boolean {
  const [fh, fm] = range.from.split(":").map((n) => parseInt(n, 10) || 0);
  const [th, tm] = range.to.split(":").map((n) => parseInt(n, 10) || 0);
  const now = visitor.hour * 60;
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from <= to) return now >= from && now <= to;
  return now >= from || now <= to; // wraps midnight
}

export function matchesConditions(
  conditions: RuleConditions,
  visitor: VisitorContext
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  // OS
  const osList = asArray(conditions.os).map(ci);
  if (osList.length && !osList.includes(ci(visitor.device.os))) return false;

  // Device type
  const deviceList = asArray(conditions.device).map(ci);
  if (deviceList.length && !deviceList.includes(ci(visitor.device.type))) return false;

  // Browser
  const browserList = asArray(conditions.browser).map(ci);
  if (browserList.length && !browserList.includes(ci(visitor.device.browser))) return false;

  // Country
  const countryList = asArray(conditions.country).map((c) => c.toUpperCase());
  if (countryList.length && !countryList.includes((visitor.geo.country || "").toUpperCase())) {
    return false;
  }

  // Language (primary tag)
  const langList = asArray(conditions.language).map(ci);
  if (langList.length && !langList.includes(ci(visitor.language))) return false;

  // Referrer domain
  const refList = asArray(conditions.referrer_domain).map(ci);
  if (refList.length) {
    const visitorRef = ci(visitor.referrerDomain);
    if (!refList.some((r) => visitorRef === r || visitorRef.endsWith("." + r))) return false;
  }

  // UTM
  if (conditions.utm_source) {
    const list = asArray(conditions.utm_source).map(ci);
    if (!list.includes(ci(visitor.utm.source))) return false;
  }
  if (conditions.utm_medium) {
    const list = asArray(conditions.utm_medium).map(ci);
    if (!list.includes(ci(visitor.utm.medium))) return false;
  }
  if (conditions.utm_campaign) {
    const list = asArray(conditions.utm_campaign).map(ci);
    if (!list.includes(ci(visitor.utm.campaign))) return false;
  }

  // Bot
  if (conditions.is_bot !== undefined && conditions.is_bot !== visitor.bot.isBot) return false;

  // VPN/Proxy (placeholder)
  if (conditions.is_vpn !== undefined && conditions.is_vpn !== visitor.isVpn) return false;

  // Visitor type
  if (conditions.visitor_type && conditions.visitor_type !== visitor.visitorType) return false;

  // Weekday
  const weekdayList = asArray(conditions.weekday);
  if (weekdayList.length && !weekdayList.includes(visitor.weekday)) return false;

  // Time range
  if (conditions.time_range && !timeInRange(visitor, conditions.time_range)) return false;

  return true;
}

/**
 * Pick the first rule (sorted by priority ASC) whose conditions match.
 * Lower priority value = higher precedence (evaluated first).
 */
export function pickRule(
  rules: LinkRule[],
  visitor: VisitorContext
): LinkRule | null {
  const active = rules.filter((r) => r.is_active);
  active.sort((a, b) => a.priority - b.priority);
  for (const rule of active) {
    if (matchesConditions(rule.conditions, visitor)) return rule;
  }
  return null;
}
