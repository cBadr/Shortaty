"use client";

import { useState } from "react";
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Gift } from "lucide-react";

interface Tx {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}
interface Order {
  id: string;
  amount_usd: number;
  credits: number;
  currency: string | null;
  status: string;
  created_at: string;
  coinpayments_txn_id: string | null;
}

const CURRENCIES = [
  { value: "USDT.TRC20", label: "USDT (TRC20) — recommended" },
  { value: "USDT.ERC20", label: "USDT (ERC20)" },
  { value: "BTC", label: "Bitcoin" },
  { value: "ETH", label: "Ethereum" },
  { value: "LTC", label: "Litecoin" },
  { value: "DOGE", label: "Dogecoin" },
];

const PRESETS = [10, 25, 50, 100, 250, 500];

export function WalletPanel({
  balance,
  transactions,
  orders,
  creditsPerUsd,
}: {
  balance: number;
  transactions: Tx[];
  orders: Order[];
  creditsPerUsd: number;
}) {
  const [amount, setAmount] = useState(25);
  const [currency, setCurrency] = useState("USDT.TRC20");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topup, setTopup] = useState<{
    address: string;
    amount: string;
    qrcode_url: string;
    checkout_url: string;
  } | null>(null);

  async function onTopup() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amount, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Topup failed");
      setTopup({
        address: data.address,
        amount: data.amount,
        qrcode_url: data.qrcode_url,
        checkout_url: data.checkout_url,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Topup failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm opacity-80 mb-1">
          <Wallet className="size-4" /> Balance
        </div>
        <div className="text-4xl font-bold">{balance.toFixed(3)} <span className="text-xl opacity-70">credits</span></div>
        <div className="text-xs opacity-70 mt-1">1 USD ≈ {creditsPerUsd} credits</div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="size-4" /> Top up</h2>

        {topup ? (
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <p>Send <strong>{topup.amount} {currency}</strong> to:</p>
            <code className="block break-all font-mono text-xs bg-background p-2 rounded">{topup.address}</code>
            {topup.qrcode_url && (
              <img src={topup.qrcode_url} alt="QR" className="w-40 h-40 rounded-md border border-border" />
            )}
            <p className="text-xs text-muted-foreground">
              Once received, your balance is credited automatically (1–3 confirmations).
            </p>
            <a href={topup.checkout_url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline text-sm inline-block">
              Open in Coinpayments →
            </a>
            <button onClick={() => setTopup(null)} className="block text-xs text-muted-foreground hover:underline">
              New topup
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Amount (USD)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`px-3 py-1 text-sm rounded-md ${amount === p ? "bg-brand-500 text-white" : "bg-muted hover:bg-brand-500/10"}`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min={1}
                max={10000}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
              <div className="text-xs text-muted-foreground mt-1">
                = {(amount * creditsPerUsd).toLocaleString()} credits
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pay with</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={onTopup}
              disabled={pending || amount < 1}
              className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm hover:bg-brand-600 disabled:opacity-60"
            >
              {pending ? "Creating order..." : "Continue"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Recent transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((tx) => {
                const isCredit = tx.amount > 0;
                const Icon = tx.type === "bonus" ? Gift : isCredit ? ArrowDownCircle : ArrowUpCircle;
                return (
                  <li key={tx.id} className="py-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-4 ${isCredit ? "text-green-500" : "text-red-500"}`} />
                      <div>
                        <div>{tx.description || tx.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono ${isCredit ? "text-green-600" : "text-red-600"}`}>
                      {isCredit ? "+" : ""}
                      {tx.amount.toFixed(3)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Top-up orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="py-2 text-sm flex items-center justify-between">
                  <div>
                    <div>${o.amount_usd} → {o.credits.toFixed(0)} credits</div>
                    <div className="text-xs text-muted-foreground">
                      {o.currency || "—"} · {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === "paid"
                        ? "bg-green-500/10 text-green-700"
                        : o.status === "cancelled" || o.status === "expired" || o.status === "failed"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-amber-500/10 text-amber-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
