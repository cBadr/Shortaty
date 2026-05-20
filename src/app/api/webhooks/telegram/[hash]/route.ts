import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, shortHash } from "@/lib/crypto";
import { sendMessage } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  // Optional secret-token check (matches the value passed to setWebhook)
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.CRON_SECRET && secretHeader && secretHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { hash } = await params;
  const update = (await request.json()) as TelegramUpdate;
  if (!update.message) return NextResponse.json({ ok: true });

  const sb = createAdminClient();

  // Find which user this bot belongs to. We stored the token encrypted, so we
  // can't query by hash directly. Iterate linked users with bot_token IS NOT NULL
  // and match by re-hashing the decrypted token.
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, telegram_bot_token")
    .not("telegram_bot_token", "is", null);

  let matchedUserId: string | null = null;
  let matchedToken: string | null = null;
  for (const p of (profiles ?? []) as { id: string; telegram_bot_token: string }[]) {
    try {
      const token = await decryptSecret(p.telegram_bot_token);
      const h = await shortHash(token);
      if (h === hash) {
        matchedUserId = p.id;
        matchedToken = token;
        break;
      }
    } catch {
      // skip malformed
    }
  }

  if (!matchedUserId || !matchedToken) {
    return NextResponse.json({ ok: true, note: "bot not registered" });
  }

  const text = update.message.text || "";
  const chatId = String(update.message.chat.id);

  if (text.startsWith("/start")) {
    await sb
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_verified: true })
      .eq("id", matchedUserId);

    await sendMessage(
      matchedToken,
      chatId,
      "✅ <b>Linked to Shortaty (شورتاتي)</b>\n\nYou'll receive notifications here per your settings."
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/ping")) {
    await sendMessage(matchedToken, chatId, "🏓 pong");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
