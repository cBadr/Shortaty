"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { createCampaign, deleteCampaign } from "./actions";

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  link_count: number;
}

export function CampaignsPanel({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createCampaign(fd);
      if (res.error) return setError(res.error);
      setShowForm(false);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this campaign? Links inside it will not be deleted.")) return;
    start(async () => {
      await deleteCampaign(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm"
        >
          <Plus className="size-4" /> New campaign
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 text-red-600 rounded-md text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={onCreate} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" required className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input name="color" type="color" defaultValue="#3b82f6" className="w-16 h-9 rounded border border-input bg-background" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-border rounded-md text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <FolderKanban className="size-8 mx-auto mb-2 opacity-50" />
          No campaigns yet. Group your links to organise your work.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: c.color }} />
                  <h3 className="font-semibold">{c.name}</h3>
                </div>
                <button
                  onClick={() => onDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                  disabled={pending}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {c.description && <p className="text-xs text-muted-foreground mb-3">{c.description}</p>}
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{c.link_count} links</span>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
