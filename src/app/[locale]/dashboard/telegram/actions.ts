"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, shortHash } from "@/lib/crypto";
import { deleteWebhook, getMe, setWebhook } from "@/lib/telegram/client";
import { DEFAULT_TEMPLATES, type TemplateEvent } from "@/lib/telegram/templates";

const tokenSchema = z.string().regex(/^\d+:[A-Za-z0-9_-]{30,}$/, "Invalid Telegram bot token");

export async function saveBotToken(formData: FormData): Promise<{ error?: string; ok?: boolean; username?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid token" };
  const token = parsed.data;

  const me = await getMe(token);
  if (!me.ok || !me.result) return { error: me.description || "Telegram rejected this token" };

  const encrypted = await encryptSecret(token);
  const hash = await shortHash(token);
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/telegram/${hash}`;

  // Best effort: register webhook (will fail on localhost which is fine)
  try {
    await setWebhook(token, webhookUrl, process.env.CRON_SECRET);
  } catch {
    // ignore — user can re-trigger later
  }

  const sb = createAdminClient();
  await sb
    .from("profiles")
    .update({
      telegram_bot_token: encrypted,
      telegram_chat_id: null,
      telegram_verified: false,
    })
    .eq("id", user.id);

  // Seed default templates if missing
  for (const event of Object.keys(DEFAULT_TEMPLATES) as TemplateEvent[]) {
    await sb
      .from("telegram_templates")
      .upsert(
        {
          user_id: user.id,
          event,
          template: DEFAULT_TEMPLATES[event],
          is_enabled: event === "on_click" || event === "digest_daily",
        },
        { onConflict: "user_id,event", ignoreDuplicates: true }
      );
  }

  revalidatePath("/dashboard/telegram");
  return { ok: true, username: me.result.username };
}

export async function unlinkBot(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_bot_token")
    .eq("id", user.id)
    .maybeSingle();
  const encrypted = (profile as { telegram_bot_token?: string | null } | null)?.telegram_bot_token;
  if (encrypted) {
    try {
      const { decryptSecret } = await import("@/lib/crypto");
      const token = await decryptSecret(encrypted);
      await deleteWebhook(token);
    } catch {
      // ignore
    }
  }

  const sb = createAdminClient();
  await sb
    .from("profiles")
    .update({ telegram_bot_token: null, telegram_chat_id: null, telegram_verified: false })
    .eq("id", user.id);
  revalidatePath("/dashboard/telegram");
}

const templateUpdateSchema = z.object({
  event: z.string(),
  template: z.string().max(4000),
  is_enabled: z.coerce.boolean(),
  throttle_seconds: z.coerce.number().int().min(0).max(86400).default(0),
});

export async function updateTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = templateUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  await supabase
    .from("telegram_templates")
    .upsert(
      {
        user_id: user.id,
        event: parsed.data.event,
        template: parsed.data.template,
        is_enabled: parsed.data.is_enabled,
        throttle_seconds: parsed.data.throttle_seconds,
      },
      { onConflict: "user_id,event" }
    );

  revalidatePath("/dashboard/telegram");
  return {};
}
