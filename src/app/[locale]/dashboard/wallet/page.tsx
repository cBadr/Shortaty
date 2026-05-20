import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WalletPanel } from "./wallet-panel";

interface Profile {
  credits_balance: number;
}
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

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: txs }, { data: orders }, { data: rate }] = await Promise.all([
    supabase.from("profiles").select("credits_balance").eq("id", user!.id).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id,type,amount,balance_after,description,created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("topup_orders")
      .select("id,amount_usd,credits,currency,status,created_at,coinpayments_txn_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("system_settings").select("value").eq("key", "credits_per_usd").maybeSingle(),
  ]);

  const balance = (profile as Profile | null)?.credits_balance ?? 0;
  const transactions = (txs ?? []) as Tx[];
  const topupOrders = (orders ?? []) as Order[];
  const creditsPerUsd = parseFloat(((rate as { value?: string } | null)?.value as string) ?? "1000");

  return (
    <WalletPanel
      balance={balance}
      transactions={transactions}
      orders={topupOrders}
      creditsPerUsd={creditsPerUsd}
    />
  );
}
