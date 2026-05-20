import { createClient } from "@/lib/supabase/server";

export interface AnalyticsRange {
  from: Date;
  to: Date;
  linkId?: string;
  campaignId?: string;
}

export interface BreakdownRow {
  key: string;
  total: number;
  unique: number;
}

export interface TimeseriesPoint {
  day: string; // ISO date YYYY-MM-DD
  total: number;
  unique: number;
}

/**
 * Get aggregated visit stats for the current user, optionally filtered by link/campaign.
 * Honours RLS — only the user's own data is visible.
 */
async function userClicksQuery(range: AnalyticsRange) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Pre-filter: get the user's link IDs (RLS restricts but explicit IN is faster)
  let linksQ = supabase.from("links").select("id").eq("user_id", user.id);
  if (range.linkId) linksQ = linksQ.eq("id", range.linkId);
  if (range.campaignId) linksQ = linksQ.eq("campaign_id", range.campaignId);

  const { data: linkIdsData } = await linksQ;
  const linkIds = (linkIdsData ?? []).map((l) => (l as { id: string }).id);
  if (linkIds.length === 0) return { supabase, linkIds: [] };

  return { supabase, linkIds };
}

export async function getTimeseries(range: AnalyticsRange): Promise<TimeseriesPoint[]> {
  const ctx = await userClicksQuery(range);
  if (!ctx || ctx.linkIds.length === 0) return [];

  const { data } = await ctx.supabase
    .from("clicks")
    .select("clicked_at, is_unique")
    .in("link_id", ctx.linkIds)
    .gte("clicked_at", range.from.toISOString())
    .lte("clicked_at", range.to.toISOString())
    .limit(100000);

  const byDay = new Map<string, { total: number; unique: number }>();
  for (const c of (data ?? []) as { clicked_at: string; is_unique: boolean }[]) {
    const day = c.clicked_at.slice(0, 10);
    const cur = byDay.get(day) ?? { total: 0, unique: 0 };
    cur.total++;
    if (c.is_unique) cur.unique++;
    byDay.set(day, cur);
  }

  return [...byDay.entries()]
    .map(([day, v]) => ({ day, total: v.total, unique: v.unique }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function getBreakdown(
  range: AnalyticsRange,
  field: "country" | "os" | "device_type" | "browser" | "referrer_domain"
): Promise<BreakdownRow[]> {
  const ctx = await userClicksQuery(range);
  if (!ctx || ctx.linkIds.length === 0) return [];

  const { data } = await ctx.supabase
    .from("clicks")
    .select(`${field}, is_unique`)
    .in("link_id", ctx.linkIds)
    .gte("clicked_at", range.from.toISOString())
    .lte("clicked_at", range.to.toISOString())
    .limit(100000);

  const map = new Map<string, { total: number; unique: number }>();
  for (const c of (data ?? []) as Array<Record<string, unknown>>) {
    const key = (c[field] as string | null) || "—";
    const cur = map.get(key) ?? { total: 0, unique: 0 };
    cur.total++;
    if (c["is_unique"]) cur.unique++;
    map.set(key, cur);
  }

  return [...map.entries()]
    .map(([key, v]) => ({ key, total: v.total, unique: v.unique }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);
}

export async function getTotals(range: AnalyticsRange): Promise<{
  total: number;
  unique: number;
  bots: number;
  links: number;
}> {
  const ctx = await userClicksQuery(range);
  if (!ctx) return { total: 0, unique: 0, bots: 0, links: 0 };
  if (ctx.linkIds.length === 0) return { total: 0, unique: 0, bots: 0, links: 0 };

  const baseQ = () =>
    ctx.supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", ctx.linkIds)
      .gte("clicked_at", range.from.toISOString())
      .lte("clicked_at", range.to.toISOString());

  const [{ count: total }, { count: unique }, { count: bots }] = await Promise.all([
    baseQ(),
    baseQ().eq("is_unique", true),
    baseQ().eq("is_bot", true),
  ]);

  return {
    total: total ?? 0,
    unique: unique ?? 0,
    bots: bots ?? 0,
    links: ctx.linkIds.length,
  };
}

export async function getRecentClicks(range: AnalyticsRange, limit = 50) {
  const ctx = await userClicksQuery(range);
  if (!ctx || ctx.linkIds.length === 0) return [];

  const { data } = await ctx.supabase
    .from("clicks")
    .select("id, link_id, clicked_at, country, os, device_type, browser, referrer_domain, is_bot, destination_url")
    .in("link_id", ctx.linkIds)
    .gte("clicked_at", range.from.toISOString())
    .lte("clicked_at", range.to.toISOString())
    .order("clicked_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export function parseRange(searchParams: URLSearchParams): AnalyticsRange {
  const days = parseInt(searchParams.get("days") || "7", 10) || 7;
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    from,
    to,
    linkId: searchParams.get("link") || undefined,
    campaignId: searchParams.get("campaign") || undefined,
  };
}
