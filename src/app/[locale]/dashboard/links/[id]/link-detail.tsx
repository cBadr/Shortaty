"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { deleteLink, updateLink } from "../actions";
import { createRule, deleteRule, toggleRule } from "./rule-actions";

interface LinkRow {
  id: string;
  slug: string;
  title: string | null;
  default_destination_url: string;
  redirect_type: number;
  is_active: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  total_clicks: number;
  unique_clicks: number;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  domain: { hostname: string } | null;
  campaign_id: string | null;
}

interface RuleRow {
  id: string;
  link_id: string;
  priority: number;
  name: string | null;
  conditions: Record<string, unknown>;
  destination_url: string;
  is_active: boolean;
}

const EXAMPLE_RULES = [
  {
    name: "iOS visitors",
    conditions: { os: ["iOS"] },
    destination: "https://apps.apple.com/app/your-app",
  },
  {
    name: "Android visitors",
    conditions: { os: ["Android"] },
    destination: "https://play.google.com/store/apps/details?id=your.app",
  },
  {
    name: "Visitors from Egypt",
    conditions: { country: ["EG"] },
    destination: "https://example.com/eg",
  },
  {
    name: "Mobile only",
    conditions: { device: ["mobile", "tablet"] },
    destination: "https://m.example.com",
  },
];

export function LinkDetail({ link, rules }: { link: LinkRow; rules: RuleRow[] }) {
  const tLinks = useTranslations("Links");
  const tc = useTranslations("Common");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);

  const shortUrl = link.domain
    ? `https://${link.domain.hostname}/${link.slug}`
    : `/${link.slug}`;

  function copy() {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateLink(link.id, fd);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Delete this link permanently?")) return;
    start(async () => {
      await deleteLink(link.id);
    });
  }

  function onCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("link_id", link.id);
    start(async () => {
      const res = await createRule(fd);
      if (res.error) return setError(res.error);
      setShowRuleForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{link.title || link.slug}</h1>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <span>{shortUrl}</span>
            <button onClick={copy} className="text-brand-500 hover:bg-muted p-1 rounded">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md"
        >
          <Trash2 className="size-4" /> {tc("delete")}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">{tLinks("clicks")}</div>
          <div className="text-2xl font-bold">{link.total_clicks}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Unique</div>
          <div className="text-2xl font-bold">{link.unique_clicks}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-2xl font-bold">{link.is_active ? "🟢" : "⚪"}</div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={onUpdate} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Settings</h2>
        <div>
          <label className="block text-sm font-medium mb-1">{tLinks("destination")}</label>
          <input
            name="default_destination_url"
            type="url"
            defaultValue={link.default_destination_url}
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{tLinks("linkTitle")}</label>
            <input
              name="title"
              defaultValue={link.title ?? ""}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{tLinks("redirectType")}</label>
            <select
              name="redirect_type"
              defaultValue={link.redirect_type}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            >
              <option value="302">{tLinks("temporary302")}</option>
              <option value="301">{tLinks("permanent301")}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">utm_source</label>
            <input name="utm_source" defaultValue={link.utm_source ?? ""} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">utm_medium</label>
            <input name="utm_medium" defaultValue={link.utm_medium ?? ""} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">utm_campaign</label>
            <input name="utm_campaign" defaultValue={link.utm_campaign ?? ""} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <input type="checkbox" name="is_active" defaultChecked={link.is_active} value="true" /> {tLinks("active")}
          </label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm hover:bg-brand-600"
        >
          {tc("save")}
        </button>
      </form>

      {/* Rules */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Smart Targeting Rules</h2>
            <p className="text-xs text-muted-foreground mt-1">
              First matching rule wins. If no rule matches, the default destination is used.
            </p>
          </div>
          <button
            onClick={() => setShowRuleForm((s) => !s)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-500 text-white rounded-md hover:bg-brand-600"
          >
            <Plus className="size-4" /> Rule
          </button>
        </div>

        {rules.length === 0 && !showRuleForm && (
          <p className="text-sm text-muted-foreground py-4">No rules yet. All visitors go to the default URL.</p>
        )}

        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
              <button
                onClick={() => start(() => toggleRule(link.id, r.id, !r.is_active).then(() => router.refresh()))}
                className={r.is_active ? "text-brand-500" : "text-muted-foreground"}
                title={r.is_active ? "Disable" : "Enable"}
              >
                {r.is_active ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium">{r.name || `Rule #${r.priority}`}</div>
                <code className="text-xs text-muted-foreground block mt-1 font-mono">{JSON.stringify(r.conditions)}</code>
                <div className="text-xs mt-1">→ <span className="text-brand-500">{r.destination_url}</span></div>
              </div>
              <button
                onClick={() => start(() => deleteRule(link.id, r.id).then(() => router.refresh()))}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {showRuleForm && (
          <form onSubmit={onCreateRule} className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input name="name" placeholder="e.g. iOS users" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Priority (lower = first)</label>
                <input name="priority" type="number" defaultValue={10} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Destination URL</label>
              <input name="destination_url" type="url" required className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Conditions (JSON)</label>
              <textarea
                name="conditions"
                required
                rows={4}
                defaultValue='{"os":["iOS"]}'
                className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {EXAMPLE_RULES.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={(e) => {
                      const form = (e.target as HTMLButtonElement).closest("form")!;
                      (form.elements.namedItem("name") as HTMLInputElement).value = ex.name;
                      (form.elements.namedItem("conditions") as HTMLTextAreaElement).value = JSON.stringify(ex.conditions);
                      (form.elements.namedItem("destination_url") as HTMLInputElement).value = ex.destination;
                    }}
                    className="text-xs px-2 py-1 bg-muted rounded hover:bg-brand-500/10"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm">
                {tc("save")}
              </button>
              <button type="button" onClick={() => setShowRuleForm(false)} className="px-4 py-2 border border-border rounded-md text-sm">
                {tc("cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
