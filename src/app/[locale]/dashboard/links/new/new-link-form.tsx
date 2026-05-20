"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createLink } from "../actions";

interface Domain {
  id: string;
  hostname: string;
  is_default: boolean;
}

export function NewLinkForm({ domains }: { domains: Domain[] }) {
  const t = useTranslations("Links");
  const tc = useTranslations("Common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (domains.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No active domain available yet. The admin must add and verify a domain first.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createLink(fd);
      if (res.error) return setError(res.error);
      if (res.id) router.push(`/dashboard/links/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-card border border-border rounded-xl p-6">
      <div>
        <label className="block text-sm font-medium mb-1">{t("destination")} *</label>
        <input
          name="default_destination_url"
          type="url"
          required
          placeholder="https://example.com/long/path"
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("domain")} *</label>
          <select
            name="domain_id"
            required
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.hostname} {d.is_default ? "(default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("slug")}</label>
          <input
            name="slug"
            placeholder={t("slugAutoNote")}
            className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t("linkTitle")}</label>
        <input
          name="title"
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t("redirectType")}</label>
        <select
          name="redirect_type"
          defaultValue="302"
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="302">{t("temporary302")}</option>
          <option value="301">{t("permanent301")}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="text-sm text-brand-500 hover:underline"
      >
        {showAdvanced ? "− Advanced" : "+ Advanced"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("expiresAt")}</label>
              <input
                name="expires_at"
                type="datetime-local"
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("maxClicks")}</label>
              <input
                name="max_clicks"
                type="number"
                min={1}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">utm_source</label>
              <input name="utm_source" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">utm_medium</label>
              <input name="utm_medium" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">utm_campaign</label>
              <input name="utm_campaign" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("ogTitle")}</label>
            <input name="og_title" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("ogDescription")}</label>
            <input name="og_description" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("ogImage")}</label>
            <input name="og_image" type="url" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-brand-500 text-white rounded-md font-medium hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "..." : tc("create")}
        </button>
      </div>
    </form>
  );
}
