import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyIpnHmac } from "@/lib/coinpayments/client";
import { enqueueNotification } from "@/lib/telegram/enqueue";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("hmac");
  if (!verifyIpnHmac(rawBody, hmac)) {
    return new NextResponse("Bad HMAC", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const ipn = Object.fromEntries(params.entries());

  const orderId = ipn.custom || ipn.invoice;
  const txnId = ipn.txn_id;
  const statusCode = parseInt(ipn.status ?? "-1", 10);
  const merchant = ipn.merchant;

  if (process.env.COINPAYMENTS_MERCHANT_ID && merchant !== process.env.COINPAYMENTS_MERCHANT_ID) {
    return new NextResponse("Wrong merchant", { status: 401 });
  }

  if (!orderId) return new NextResponse("Missing order id", { status: 400 });

  const sb = createAdminClient();
  const { data: order } = await sb
    .from("topup_orders")
    .select("id, user_id, amount_usd, credits, status")
    .eq("id", orderId)
    .maybeSingle();

  const o = order as
    | { id: string; user_id: string; amount_usd: number; credits: number; status: string }
    | null;
  if (!o) return new NextResponse("Order not found", { status: 404 });

  if (statusCode >= 100 || statusCode === 2) {
    // Paid
    if (o.status === "paid") {
      return NextResponse.json({ ok: true, note: "already credited" });
    }
    await sb
      .from("topup_orders")
      .update({
        status: "paid",
        coinpayments_txn_id: txnId,
        ipn_data: ipn,
        paid_at: new Date().toISOString(),
      })
      .eq("id", o.id);

    const { data: balRow } = await sb.rpc("add_credits", {
      p_user_id: o.user_id,
      p_amount: o.credits,
      p_type: "topup",
      p_description: `Coinpayments topup ${o.amount_usd} USD`,
      p_reference: txnId,
      p_metadata: { coinpayments: { txn_id: txnId, currency: ipn.currency2 } },
    });

    await enqueueNotification(sb, o.user_id, "new_topup", {
      amount: o.amount_usd.toString(),
      currency: ipn.currency2 || "USD",
      credits: o.credits.toFixed(2),
      new_balance: balRow != null ? Number(balRow).toFixed(2) : "—",
    });
  } else if (statusCode < 0) {
    // Cancelled/failed/timeout
    await sb
      .from("topup_orders")
      .update({ status: "cancelled", ipn_data: ipn })
      .eq("id", o.id);
  } else {
    // Pending/confirmations — just store progress
    await sb.from("topup_orders").update({ ipn_data: ipn }).eq("id", o.id);
  }

  return NextResponse.json({ ok: true });
}
