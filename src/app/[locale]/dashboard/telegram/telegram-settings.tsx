"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { saveBotToken, unlinkBot, updateTemplate } from "./actions";

interface Template {
  event: string;
  template: string;
  is_enabled: boolean;
  throttle_seconds: number;
}

const EVENT_LABELS: Record<string, string> = {
  on_click: "On every click",
  digest_minutes: "Periodic digest (every N minutes)",
  digest_hourly: "Hourly digest",
  digest_daily: "Daily digest",
  low_balance: "Low balance alert",
  new_topup: "Wallet topped up",
  milestone: "Click milestone reached",
  link_expired: "Link expired",
};

export function TelegramSettings({
  linked,
  verified,
  chatId,
  templates,
}: {
  linked: boolean;
  verified: boolean;
  chatId: string | null;
  templates: Template[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSaveToken(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveBotToken(fd);
      if (res.error) return setError(res.error);
      setSuccess(`Linked to @${res.username}. Open your bot in Telegram and send /start to complete setup.`);
      router.refresh();
    });
  }

  function onUnlink() {
    if (!confirm("Unlink this bot? Notifications will stop.")) return;
    start(async () => {
      await unlinkBot();
      router.refresh();
    });
  }

  function onSaveTemplate(t: Template, patch: Partial<Template>) {
    const fd = new FormData();
    fd.set("event", t.event);
    fd.set("template", patch.template ?? t.template);
    fd.set("is_enabled", String(patch.is_enabled ?? t.is_enabled));
    fd.set("throttle_seconds", String(patch.throttle_seconds ?? t.throttle_seconds));
    start(async () => {
      const res = await updateTemplate(fd);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">Telegram Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Bring your own bot. Create one with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">@BotFather</a>, paste the token here, then send <code>/start</code> to your bot.
        </p>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-md text-sm ${error ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-700"}`}>
          {error || success}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Send className="size-4 text-brand-500" /> Bot connection
        </h2>

        {linked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-500" />
              <span>Bot token stored.</span>
            </div>
            {verified ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Chat verified (chat_id <code className="font-mono">{chatId}</code>) — notifications enabled.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4 text-amber-500" />
                <span>Open your bot in Telegram and send <code>/start</code> so we can capture your chat_id.</span>
              </div>
            )}
            <button
              onClick={onUnlink}
              disabled={pending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md"
            >
              <Trash2 className="size-4" /> Unlink bot
            </button>
          </div>
        ) : (
          <form onSubmit={onSaveToken} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Bot token</label>
              <input
                name="token"
                placeholder="123456789:ABCdefGhIJKlmNoPQRstUVwxyz"
                className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm hover:bg-brand-600"
            >
              {pending ? "..." : "Link bot"}
            </button>
          </form>
        )}
      </div>

      {linked && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Notification templates</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Placeholders: <code>{"{country}"}</code>, <code>{"{os}"}</code>, <code>{"{browser}"}</code>, <code>{"{device}"}</code>, <code>{"{link_slug}"}</code>, <code>{"{destination}"}</code>, <code>{"{total_clicks}"}</code>, <code>{"{is_unique}"}</code>, etc.
          </p>
          <div className="space-y-4">
            {templates.map((t) => (
              <details key={t.event} className="border border-border rounded-lg p-3">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={t.is_enabled}
                      onChange={(e) => onSaveTemplate(t, { is_enabled: e.target.checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium">{EVENT_LABELS[t.event] ?? t.event}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  <textarea
                    defaultValue={t.template}
                    rows={4}
                    onBlur={(e) => {
                      if (e.target.value !== t.template) onSaveTemplate(t, { template: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-xs"
                  />
                  {t.event === "on_click" && (
                    <div className="flex items-center gap-2 text-xs">
                      <label>Throttle (sec):</label>
                      <input
                        type="number"
                        min={0}
                        defaultValue={t.throttle_seconds}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10) || 0;
                          if (v !== t.throttle_seconds) onSaveTemplate(t, { throttle_seconds: v });
                        }}
                        className="w-20 px-2 py-1 border border-input bg-background rounded text-xs"
                      />
                      <span className="text-muted-foreground">(0 = no throttle)</span>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
