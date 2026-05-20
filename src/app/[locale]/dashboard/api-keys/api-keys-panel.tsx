"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2, Plus, AlertCircle, KeySquare } from "lucide-react";
import { createApiKey, revokeApiKey } from "./actions";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

const SCOPES = [
  { value: "links:read", label: "links:read" },
  { value: "links:write", label: "links:write" },
  { value: "campaigns:read", label: "campaigns:read" },
  { value: "campaigns:write", label: "campaigns:write" },
  { value: "analytics:read", label: "analytics:read" },
  { value: "wallet:read", label: "wallet:read" },
];

export function ApiKeysPanel({ keys }: { keys: KeyRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ plaintext: string; prefix: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createApiKey(fd);
      if (res.error) return setError(res.error);
      if (res.plaintext) setNewKey({ plaintext: res.plaintext, prefix: res.prefix ?? "" });
      setShowForm(false);
      router.refresh();
    });
  }

  function onRevoke(id: string) {
    if (!confirm("Revoke this key? Apps using it will stop working.")) return;
    start(async () => {
      await revokeApiKey(id);
      router.refresh();
    });
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Use API keys to integrate Shortaty with your apps. Authenticate with the header{" "}
          <code className="font-mono">Authorization: Bearer {"<key>"}</code>.
        </p>
      </div>

      {newKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <AlertCircle className="size-4" /> Save this key now — it won&apos;t be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs bg-background px-3 py-2 rounded border border-border flex-1 break-all">
              {newKey.plaintext}
            </code>
            <button onClick={copyKey} className="px-3 py-2 bg-brand-500 text-white rounded-md text-sm">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-amber-700 hover:underline">
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/10 text-red-600 rounded-md text-sm">{error}</div>}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm"
        >
          <Plus className="size-4" /> New key
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              name="name"
              required
              placeholder="My integration"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scopes (comma-separated, or empty = full access)</label>
            <input
              name="scopes"
              placeholder="links:read, links:write, analytics:read"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {SCOPES.map((s) => (
                <span key={s.value} className="px-2 py-0.5 text-xs bg-muted rounded">{s.label}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expires in (days, optional)</label>
            <input
              name="expires_days"
              type="number"
              min={1}
              max={3650}
              placeholder="365"
              className="w-32 px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm">
              Generate
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-border rounded-md text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase border-b border-border">
            <tr>
              <th className="px-4 py-2 text-start">Name</th>
              <th className="px-4 py-2 text-start">Key</th>
              <th className="px-4 py-2 text-start">Scopes</th>
              <th className="px-4 py-2 text-start">Last used</th>
              <th className="px-4 py-2 text-start">Expires</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                  <KeySquare className="size-6 mx-auto mb-2 opacity-50" />
                  No keys yet.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{k.prefix}</td>
                  <td className="px-4 py-2">
                    {k.scopes.length === 0 || k.scopes.includes("*") ? (
                      <span className="text-xs text-amber-600">full access</span>
                    ) : (
                      <span className="text-xs">{k.scopes.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "never"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onRevoke(k.id)}
                      disabled={pending}
                      className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
