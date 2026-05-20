import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTransaction } from "@/lib/coinpayments/client";

export const dynamic = "force-dynamic";

const topupSchema = z.object({
  amount_usd: z.number().positive().min(1).max(10000),
  currency: z.string().min(2).max(20),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = topupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const { amount_usd, currency } = parsed.data;

  // Look up credits/USD rate
  const { data: rateSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "credits_per_usd")
    .maybeSingle();
  const ratePer$ = parseFloat(((rateSetting as { value?: string } | null)?.value as string) ?? "1000");
  const credits = amount_usd * ratePer$;

  const sb = createAdminClient();

  const { data: order, error: orderErr } = await sb
    .from("topup_orders")
    .insert({
      user_id: user.id,
      amount_usd,
      credits,
      currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 500 });
  }

  const orderId = order.id as string;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const tx = await createTransaction({
      amountUsd: amount_usd,
      currency2: currency,
      buyerEmail: user.email!,
      itemName: `Shortaty topup ${amount_usd} USD`,
      custom: orderId,
      ipnUrl: `${appUrl}/api/webhooks/coinpayments`,
      successUrl: `${appUrl}/dashboard/wallet?topup=success`,
      cancelUrl: `${appUrl}/dashboard/wallet?topup=cancel`,
    });

    await sb
      .from("topup_orders")
      .update({
        coinpayments_txn_id: tx.txn_id,
        address: tx.address,
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      txn_id: tx.txn_id,
      address: tx.address,
      amount: tx.amount,
      qrcode_url: tx.qrcode_url,
      checkout_url: tx.checkout_url,
      status_url: tx.status_url,
      timeout: tx.timeout,
    });
  } catch (e) {
    await sb.from("topup_orders").update({ status: "failed" }).eq("id", orderId);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Coinpayments error" },
      { status: 500 }
    );
  }
}
