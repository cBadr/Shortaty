import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotification } from "@/lib/telegram/enqueue";
import type { TemplateEvent } from "@/lib/telegram/templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const period = (url.searchParams.get("period") ?? "hourly") as "hourly" | "daily";
  const event: TemplateEvent = period === "daily" ? "digest_daily" : "digest_hourly";

  const sb = createAdminClient();

  // Find users with this digest enabled
  const { data: tplRows } = await sb
    .from("telegram_templates")
    .select("user_id")
    .eq("event", event)
    .eq("is_enabled", true);

  const userIds = ((tplRows ?? []) as { user_id: string }[]).map((r) => r.user_id);
  if (userIds.length === 0) return NextResponse.json({ ok: true, users: 0 });

  const now = new Date();
  const from = new Date(now.getTime() - (period === "daily" ? 24 : 1) * 60 * 60 * 1000);
  const periodLabel = period === "daily"
    ? `${from.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`
    : `${from.toISOString().slice(11, 16)} → ${now.toISOString().slice(11, 16)} UTC`;

  let enqueued = 0;
  for (const userId of userIds) {
    const { data: linksData } = await sb.from("links").select("id, slug").eq("user_id", userId);
    const links = (linksData ?? []) as { id: string; slug: string }[];
    if (links.length === 0) continue;

    const linkIds = links.map((l) => l.id);

    const { data: clicksData } = await sb
      .from("clicks")
      .select("country, os, link_id, is_unique")
      .in("link_id", linkIds)
      .gte("clicked_at", from.toISOString())
      .lte("clicked_at", now.toISOString())
      .limit(50000);

    const rows = (clicksData ?? []) as Array<{ country: string | null; os: string | null; link_id: string; is_unique: boolean }>;
    if (rows.length === 0) continue;

    const total = rows.length;
    const unique = rows.filter((r) => r.is_unique).length;
    const byCountry = new Map<string, number>();
    const byOs = new Map<string, number>();
    const byLink = new Map<string, number>();
    for (const r of rows) {
      byCountry.set(r.country || "—", (byCountry.get(r.country || "—") ?? 0) + 1);
      byOs.set(r.os || "—", (byOs.get(r.os || "—") ?? 0) + 1);
      byLink.set(r.link_id, (byLink.get(r.link_id) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topLinkId = top(byLink);
    const topLink = links.find((l) => l.id === topLinkId)?.slug ?? "—";

    await enqueueNotification(sb, userId, event, {
      period: periodLabel,
      total,
      unique,
      top_country: top(byCountry),
      top_os: top(byOs),
      top_link: topLink,
    });
    enqueued++;
  }

  return NextResponse.json({ ok: true, enqueued });
}
