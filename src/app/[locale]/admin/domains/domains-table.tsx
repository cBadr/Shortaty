"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Trash2,
  Plus,
  Star,
} from "lucide-react";
import {
  addDomainAction,
  deleteDomainAction,
  refreshDomainAction,
  verifyDomainAction,
} from "./actions";

interface DomainRow {
  id: string;
  hostname: string;
  status: string;
  vercel_domain_id: string | null;
  dns_configured: boolean;
  is_default: boolean;
  created_at: string;
}

const STATUS_BADGE: Record<string, { icon: typeof Clock; class: string; label: string }> = {
  active: { icon: CheckCircle2, class: "text-green-600 bg-green-500/10", label: "Active" },
  verifying: { icon: Clock, class: "text-amber-600 bg-amber-500/10", label: "Verifying" },
  pending: { icon: Clock, class: "text-muted-foreground bg-muted", label: "Pending" },
  error: { icon: XCircle, class: "text-red-600 bg-red-500/10", label: "Error" },
};

export function DomainsTable({ domains }: { domains: DomainRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await addDomainAction(fd);
      if (res.error) return setError(res.error);
      setInfo("Domain added. Add the DNS records shown by Vercel, then click 'Verify'.");
      setShowForm(false);
      router.refresh();
    });
  }

  function onVerify(hostname: string) {
    setError(null);
    start(async () => {
      const res = await verifyDomainAction(hostname);
      if (res.error) return setError(res.error);
      if (res.status === "active") setInfo(`${hostname} is now active 🎉`);
      router.refresh();
    });
  }

  function onRefresh(hostname: string) {
    setError(null);
    start(async () => {
      const res = await refreshDomainAction(hostname);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  function onDelete(hostname: string) {
    if (!confirm(`Delete ${hostname}? Existing links on it will stop working.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteDomainAction(hostname);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {(error || info) && (
        <div
          className={`p-3 rounded-md text-sm ${
            error ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-700"
          }`}
        >
          {error || info}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm"
        >
          <Plus className="size-4" /> Add domain
        </button>
      </div>

      {showForm && (
        <form onSubmit={onAdd} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Hostname</label>
            <input
              name="hostname"
              required
              placeholder="short.example.com"
              className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
            />
          </div>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="is_default" value="true" /> Make default
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm">
              {pending ? "..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-start">Hostname</th>
              <th className="px-4 py-3 text-start">Status</th>
              <th className="px-4 py-3 text-start">Default</th>
              <th className="px-4 py-3 text-start">Added</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-10">
                  No domains yet. Add your first one.
                </td>
              </tr>
            ) : (
              domains.map((d) => {
                const badge = STATUS_BADGE[d.status] || STATUS_BADGE.pending;
                const Icon = badge.icon;
                return (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono">{d.hostname}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badge.class}`}>
                        <Icon className="size-3" /> {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.is_default && <Star className="size-4 text-amber-500" fill="currentColor" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {d.status !== "active" && (
                          <button
                            onClick={() => onVerify(d.hostname)}
                            disabled={pending}
                            className="px-2 py-1 text-xs bg-brand-500/10 text-brand-600 rounded hover:bg-brand-500/20"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => onRefresh(d.hostname)}
                          disabled={pending}
                          title="Refresh status from Vercel"
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(d.hostname)}
                          disabled={pending}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded text-muted-foreground"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        After adding a domain, configure your DNS in your registrar:<br />
        • For apex (example.com): <code className="font-mono">A → 76.76.21.21</code><br />
        • For subdomain (short.example.com): <code className="font-mono">CNAME → cname.vercel-dns.com</code><br />
        Then click <strong>Verify</strong>. Vercel issues SSL automatically within minutes.
      </p>
    </div>
  );
}
