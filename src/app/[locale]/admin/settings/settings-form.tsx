"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSetting } from "./actions";

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
}

export function SystemSettingsForm({ settings }: { settings: SettingRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("key", key);
    start(async () => {
      const res = await updateSetting(fd);
      if (res.error) return setError(res.error);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {error && <div className="p-3 bg-red-500/10 text-red-600 rounded-md text-sm">{error}</div>}
      {settings.map((s) => (
        <form
          key={s.key}
          onSubmit={(e) => onSave(e, s.key)}
          className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <code className="block text-sm font-mono font-medium">{s.key}</code>
            {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
          </div>
          <input
            name="value"
            defaultValue={typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
            className="px-3 py-2 rounded-md border border-input bg-background font-mono text-sm w-48"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-2 bg-brand-500 text-white rounded-md text-sm"
          >
            {savedKey === s.key ? "✓ Saved" : "Save"}
          </button>
        </form>
      ))}
    </div>
  );
}
