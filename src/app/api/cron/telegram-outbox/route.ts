import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { sendMessage } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface OutboxItem {
  id: number;
  user_id: string;
  message: string;
  parse_mode: string | null;
  attempts: number;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sb = createAdminClient();
  const { data } = await sb
    .from("telegram_outbox")
    .select("id,user_id,message,parse_mode,attempts")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(50);

  const items = (data ?? []) as OutboxItem[];
  if (items.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Cache user → bot token + chat id
  const userCache = new Map<string, { token: string; chatId: string } | null>();

  async function getUserBot(userId: string) {
    if (userCache.has(userId)) return userCache.get(userId)!;
    const { data: p } = await sb
      .from("profiles")
      .select("telegram_bot_token, telegram_chat_id, telegram_verified")
      .eq("id", userId)
      .maybeSingle();
    const row = p as
      | { telegram_bot_token: string | null; telegram_chat_id: string | null; telegram_verified: boolean }
      | null;
    if (!row?.telegram_bot_token || !row.telegram_chat_id || !row.telegram_verified) {
      userCache.set(userId, null);
      return null;
    }
    try {
      const token = await decryptSecret(row.telegram_bot_token);
      const value = { token, chatId: row.telegram_chat_id };
      userCache.set(userId, value);
      return value;
    } catch {
      userCache.set(userId, null);
      return null;
    }
  }

  let sent = 0;
  let failed = 0;
  for (const item of items) {
    const bot = await getUserBot(item.user_id);
    if (!bot) {
      await sb
        .from("telegram_outbox")
        .update({ status: "failed", last_error: "no bot configured" })
        .eq("id", item.id);
      failed++;
      continue;
    }

    try {
      const res = await sendMessage(
        bot.token,
        bot.chatId,
        item.message,
        (item.parse_mode as "HTML" | "Markdown" | "MarkdownV2") || "HTML"
      );
      if (res.ok) {
        await sb
          .from("telegram_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);
        sent++;
      } else {
        const nextAttempts = item.attempts + 1;
        const giveUp = nextAttempts >= 5;
        await sb
          .from("telegram_outbox")
          .update({
            status: giveUp ? "failed" : "pending",
            attempts: nextAttempts,
            last_error: res.description || `error ${res.error_code}`,
            send_at: new Date(Date.now() + 60_000 * nextAttempts).toISOString(),
          })
          .eq("id", item.id);
        failed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      await sb
        .from("telegram_outbox")
        .update({
          status: "pending",
          attempts: item.attempts + 1,
          last_error: message,
          send_at: new Date(Date.now() + 60_000 * (item.attempts + 1)).toISOString(),
        })
        .eq("id", item.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
