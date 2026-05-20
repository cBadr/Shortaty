import type { SupabaseClient } from "@supabase/supabase-js";
import { renderTemplate, type EventData, type TemplateEvent } from "./templates";

interface Template {
  event: string;
  template: string;
  is_enabled: boolean;
  throttle_seconds: number;
}

/**
 * Enqueue a Telegram notification for a user, respecting their template settings.
 * No-op if the user has not linked a bot, the template is disabled, or throttled.
 */
export async function enqueueNotification(
  sb: SupabaseClient,
  userId: string,
  event: TemplateEvent,
  data: EventData
): Promise<void> {
  const { data: profile } = await sb
    .from("profiles")
    .select("telegram_verified, telegram_chat_id")
    .eq("id", userId)
    .maybeSingle();

  const verified = (profile as { telegram_verified?: boolean } | null)?.telegram_verified;
  if (!verified) return;

  const { data: tplRow } = await sb
    .from("telegram_templates")
    .select("event, template, is_enabled, throttle_seconds")
    .eq("user_id", userId)
    .eq("event", event)
    .maybeSingle();

  const tpl = tplRow as Template | null;
  if (!tpl || !tpl.is_enabled) return;

  if (tpl.throttle_seconds > 0) {
    const since = new Date(Date.now() - tpl.throttle_seconds * 1000).toISOString();
    const { count } = await sb
      .from("telegram_outbox")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return;
  }

  const message = renderTemplate(tpl.template, data);

  await sb.from("telegram_outbox").insert({
    user_id: userId,
    message,
    parse_mode: "HTML",
    status: "pending",
    send_at: new Date().toISOString(),
  });
}
