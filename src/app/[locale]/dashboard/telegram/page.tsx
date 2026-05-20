import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TelegramSettings } from "./telegram-settings";
import { DEFAULT_TEMPLATES, type TemplateEvent } from "@/lib/telegram/templates";

interface TemplateRow {
  event: string;
  template: string;
  is_enabled: boolean;
  throttle_seconds: number;
}

export default async function TelegramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_bot_token,telegram_chat_id,telegram_verified")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: tpls } = await supabase
    .from("telegram_templates")
    .select("event,template,is_enabled,throttle_seconds")
    .eq("user_id", user!.id);

  const existing = ((tpls ?? []) as TemplateRow[]).reduce<Record<string, TemplateRow>>(
    (acc, t) => {
      acc[t.event] = t;
      return acc;
    },
    {}
  );

  const templateRows = (Object.keys(DEFAULT_TEMPLATES) as TemplateEvent[]).map((event) => {
    const e = existing[event];
    return {
      event,
      template: e?.template ?? DEFAULT_TEMPLATES[event],
      is_enabled: e?.is_enabled ?? false,
      throttle_seconds: e?.throttle_seconds ?? 0,
    };
  });

  const linked = !!(profile as { telegram_bot_token?: string | null } | null)?.telegram_bot_token;
  const verified = (profile as { telegram_verified?: boolean } | null)?.telegram_verified ?? false;
  const chatId = (profile as { telegram_chat_id?: string | null } | null)?.telegram_chat_id ?? null;

  return (
    <TelegramSettings
      linked={linked}
      verified={verified}
      chatId={chatId}
      templates={templateRows}
    />
  );
}
