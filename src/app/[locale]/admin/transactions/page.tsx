import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface TxRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export default async function AdminTransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: txs } = await supabase
    .from("wallet_transactions")
    .select("id,user_id,type,amount,balance_after,description,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: orders } = await supabase
    .from("topup_orders")
    .select("id,user_id,amount_usd,credits,currency,status,coinpayments_txn_id,created_at,paid_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const txList = (txs ?? []) as TxRow[];

  // Aggregate user emails
  const userIds = [...new Set(txList.map((t) => t.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,email").in("id", userIds)
    : { data: [] as { id: string; email: string }[] };
  const emailMap = new Map(((profiles ?? []) as { id: string; email: string }[]).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions & Topups</h1>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <h2 className="px-4 py-3 font-semibold border-b border-border">Wallet transactions</h2>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-start">When</th>
              <th className="px-4 py-2 text-start">User</th>
              <th className="px-4 py-2 text-start">Type</th>
              <th className="px-4 py-2 text-end">Amount</th>
              <th className="px-4 py-2 text-end">Balance after</th>
              <th className="px-4 py-2 text-start">Description</th>
            </tr>
          </thead>
          <tbody>
            {txList.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet.</td></tr>
            ) : (
              txList.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{emailMap.get(t.user_id) || t.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full bg-muted text-xs">{t.type}</span></td>
                  <td className={`px-4 py-2 text-end font-mono ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-end font-mono">{t.balance_after.toFixed(3)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{t.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <h2 className="px-4 py-3 font-semibold border-b border-border">Coinpayments topup orders</h2>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-start">When</th>
              <th className="px-4 py-2 text-start">User</th>
              <th className="px-4 py-2 text-end">USD</th>
              <th className="px-4 py-2 text-end">Credits</th>
              <th className="px-4 py-2 text-start">Currency</th>
              <th className="px-4 py-2 text-start">Status</th>
              <th className="px-4 py-2 text-start">CP txn</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet.</td></tr>
            ) : (
              ((orders ?? []) as Array<Record<string, unknown>>).map((o) => (
                <tr key={o.id as string} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(o.created_at as string).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{emailMap.get(o.user_id as string) || (o.user_id as string).slice(0, 8)}</td>
                  <td className="px-4 py-2 text-end font-mono">${(o.amount_usd as number).toFixed(2)}</td>
                  <td className="px-4 py-2 text-end font-mono">{(o.credits as number).toFixed(0)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{(o.currency as string) || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      o.status === "paid" ? "bg-green-500/10 text-green-700" :
                      ["cancelled", "expired", "failed"].includes(o.status as string) ? "bg-red-500/10 text-red-600" :
                      "bg-amber-500/10 text-amber-700"
                    }`}>{o.status as string}</span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono truncate max-w-[120px]">{(o.coinpayments_txn_id as string) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
