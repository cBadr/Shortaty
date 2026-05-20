/**
 * Coinpayments.net API client.
 * Docs: https://www.coinpayments.net/apidoc-intro
 *
 * Auth: POST x-www-form-urlencoded body with command=<cmd>&key=<public>&version=1&...
 * Signed with HMAC-SHA512(privateKey, postBody) in HMAC header.
 *
 * Node crypto is required (NOT edge-safe) — these endpoints run as Node serverless.
 */
import { createHmac } from "node:crypto";

const CP_URL = "https://www.coinpayments.net/api.php";

interface CpResponse<T> {
  error: string;
  result?: T;
}

export interface CreateTransactionResult {
  txn_id: string;
  address: string;
  amount: string;
  confirms_needed: string;
  timeout: number;
  checkout_url: string;
  status_url: string;
  qrcode_url: string;
}

function publicKey(): string {
  const v = process.env.COINPAYMENTS_PUBLIC_KEY;
  if (!v) throw new Error("COINPAYMENTS_PUBLIC_KEY not configured");
  return v;
}

function privateKey(): string {
  const v = process.env.COINPAYMENTS_PRIVATE_KEY;
  if (!v) throw new Error("COINPAYMENTS_PRIVATE_KEY not configured");
  return v;
}

async function call<T>(command: string, params: Record<string, string | number> = {}): Promise<T> {
  const body = new URLSearchParams({
    version: "1",
    key: publicKey(),
    cmd: command,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }).toString();

  const hmac = createHmac("sha512", privateKey()).update(body).digest("hex");

  const res = await fetch(CP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      HMAC: hmac,
    },
    body,
  });
  const json = (await res.json()) as CpResponse<T>;
  if (json.error !== "ok") {
    throw new Error(json.error || "Coinpayments API error");
  }
  return json.result as T;
}

export async function createTransaction(opts: {
  amountUsd: number;
  currency2: string; // e.g. "USDT.TRC20", "BTC", "ETH"
  buyerEmail: string;
  itemName?: string;
  custom?: string;   // we pass topup_orders.id here
  ipnUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CreateTransactionResult> {
  return call<CreateTransactionResult>("create_transaction", {
    amount: opts.amountUsd.toFixed(2),
    currency1: "USD",
    currency2: opts.currency2,
    buyer_email: opts.buyerEmail,
    item_name: opts.itemName || "Shortaty wallet topup",
    custom: opts.custom || "",
    ipn_url: opts.ipnUrl || "",
    success_url: opts.successUrl || "",
    cancel_url: opts.cancelUrl || "",
  });
}

/**
 * Verify an IPN webhook payload using the IPN secret.
 * The HMAC is calculated over the raw URL-encoded body using the IPN secret as the key.
 */
export function verifyIpnHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const secret = process.env.COINPAYMENTS_IPN_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  // timing-safe compare
  if (expected.length !== hmacHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return mismatch === 0;
}
