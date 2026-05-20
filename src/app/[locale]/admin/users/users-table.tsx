"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Ban, Check, DollarSign } from "lucide-react";
import { adjustCredits, setUserActive, setUserRole } from "./actions";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  credits_balance: number;
  is_active: boolean;
  created_at: string;
  telegram_verified: boolean;
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onRole(id: string, role: "admin" | "user") {
    start(async () => {
      await setUserRole(id, role);
      router.refresh();
    });
  }

  function onActive(id: string, active: boolean) {
    start(async () => {
      await setUserActive(id, active);
      router.refresh();
    });
  }

  function onAdjust(e: React.FormEvent<HTMLFormElement>, userId: string) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("user_id", userId);
    start(async () => {
      const res = await adjustCredits(fd);
      if (res.error) return setError(res.error);
      setAdjusting(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-3 bg-red-500/10 text-red-600 rounded-md text-sm">{error}</div>}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase border-b border-border">
            <tr>
              <th className="px-4 py-2 text-start">Email</th>
              <th className="px-4 py-2 text-start">Role</th>
              <th className="px-4 py-2 text-start">Balance</th>
              <th className="px-4 py-2 text-start">TG</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <>
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.email}</div>
                    {u.full_name && <div className="text-xs text-muted-foreground">{u.full_name}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onRole(u.id, u.role === "admin" ? "user" : "admin")}
                      disabled={pending}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        u.role === "admin" ? "bg-amber-500/10 text-amber-700" : "bg-muted"
                      }`}
                    >
                      {u.role === "admin" && <ShieldCheck className="size-3" />}
                      {u.role}
                    </button>
                  </td>
                  <td className="px-4 py-2 font-mono">{u.credits_balance.toFixed(3)}</td>
                  <td className="px-4 py-2">{u.telegram_verified ? "✓" : "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onActive(u.id, !u.is_active)}
                      disabled={pending}
                      className={`text-xs px-2 py-0.5 rounded ${
                        u.is_active ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {u.is_active ? <Check className="size-3 inline" /> : <Ban className="size-3 inline" />}{" "}
                      {u.is_active ? "active" : "blocked"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setAdjusting(adjusting === u.id ? null : u.id)}
                      className="text-brand-500 hover:bg-brand-500/10 p-1.5 rounded"
                    >
                      <DollarSign className="size-4" />
                    </button>
                  </td>
                </tr>
                {adjusting === u.id && (
                  <tr key={`${u.id}-adjust`}>
                    <td colSpan={6} className="px-4 py-3 bg-muted/30 border-b border-border">
                      <form onSubmit={(e) => onAdjust(e, u.id)} className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs">Amount (± credits)</label>
                          <input name="amount" type="number" step="0.01" required className="px-2 py-1 border border-input bg-background rounded text-sm w-32" />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs">Description</label>
                          <input name="description" defaultValue="Admin adjustment" className="w-full px-2 py-1 border border-input bg-background rounded text-sm" />
                        </div>
                        <button type="submit" disabled={pending} className="px-3 py-1 bg-brand-500 text-white rounded text-sm">
                          Apply
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
