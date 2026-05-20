import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotification } from "@/lib/telegram/enqueue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sb = createAdminClient();
  const { data: setting } = await sb
    .from("system_settings")
    .select("value")
    .eq("key", "low_balance_threshold")
    .maybeSingle();
  const threshold = parseFloat(((setting as { value?: string } | null)?.value as string) ?? "1");

  const { data: tplRows } = await sb
    .from("telegram_templates")
    .select("user_id")
    .eq("event", "low_balance")
    .eq("is_enabled", true);

  const enabledUsers = new Set(((tplRows ?? []) as { user_id: string }[]).map((r) => r.user_id));
  if (enabledUsers.size === 0) return NextResponse.json({ ok: true, alerted: 0 });

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, credits_balance")
    .lte("credits_balance", threshold);

  let alerted = 0;
  for (const p of (profiles ?? []) as { id: string; credits_balance: number }[]) {
    if (!enabledUsers.has(p.id)) continue;
    // Avoid re-alerting within 6 hours
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("telegram_outbox")
      .select("*", { count: "exact", head: true })
      .eq("user_id", p.id)
      .ilike("message", "%Low balance%")
      .gte("created_at", since);
    if ((count ?? 0) > 0) continue;

    await enqueueNotification(sb, p.id, "low_balance", {
      balance: p.credits_balance.toFixed(3),
      threshold: threshold.toFixed(2),
    });
    alerted++;
  }

  return NextResponse.json({ ok: true, alerted });
}
