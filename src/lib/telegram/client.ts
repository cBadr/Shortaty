const TG_BASE = "https://api.telegram.org";

export interface TelegramMessage {
  ok: boolean;
  result?: { message_id: number; chat: { id: number } };
  description?: string;
  error_code?: number;
}

export interface TelegramMe {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    username: string;
    first_name: string;
    can_join_groups: boolean;
  };
  description?: string;
}

export async function getMe(token: string): Promise<TelegramMe> {
  const res = await fetch(`${TG_BASE}/bot${token}/getMe`, { method: "GET" });
  return (await res.json()) as TelegramMe;
}

export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" | "MarkdownV2" = "HTML"
): Promise<TelegramMessage> {
  const res = await fetch(`${TG_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  return (await res.json()) as TelegramMessage;
}

export async function setWebhook(token: string, url: string, secret?: string): Promise<TelegramMessage> {
  const res = await fetch(`${TG_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    }),
  });
  return (await res.json()) as TelegramMessage;
}

export async function deleteWebhook(token: string): Promise<TelegramMessage> {
  const res = await fetch(`${TG_BASE}/bot${token}/deleteWebhook`, { method: "POST" });
  return (await res.json()) as TelegramMessage;
}
