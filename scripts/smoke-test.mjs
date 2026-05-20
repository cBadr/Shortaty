#!/usr/bin/env node
/**
 * End-to-end smoke test for Shortaty.
 * Logs in as the admin, then probes every dashboard + admin page +
 * the public v1 API (after generating a short-lived API key in the DB).
 *
 * Usage: node scripts/smoke-test.mjs [<port>] [<email>] [<password>]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const envText = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}

const port = process.argv[2] || "3002";
const email = process.argv[3] || "admin@shortaty.com";
const password = process.argv[4] || "eH-k17hk7L4Cbqkf";
const base = `http://localhost:${port}`;

const adminSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ----- 1) Sign in with password via Supabase Auth and capture session tokens -----
console.log("→ Signing in as", email);
const userSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: signin, error: signErr } = await userSb.auth.signInWithPassword({ email, password });
if (signErr || !signin.session) {
  console.error("❌ sign-in failed:", signErr);
  process.exit(1);
}
const session = signin.session;
console.log("✅ Signed in:", signin.user?.id?.slice(0, 8));

// ----- 2) Build Supabase auth cookies the @supabase/ssr server client expects -----
// Format: sb-<ref>-auth-token (base64-encoded JSON)
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;

// Supabase SSR stores the session as `base64-<base64url(JSON)>`
const sessionJson = JSON.stringify({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  expires_in: session.expires_in,
  token_type: session.token_type,
  user: signin.user,
});
const cookieValue = "base64-" + Buffer.from(sessionJson).toString("base64");

// Cookies can exceed 4 KB → @supabase/ssr splits into <name>.0, <name>.1, ...
const CHUNK = 3000;
const cookieParts = [];
for (let i = 0; i < cookieValue.length; i += CHUNK) {
  cookieParts.push({ name: `${cookieName}.${cookieParts.length}`, value: cookieValue.slice(i, i + CHUNK) });
}
const cookieHeader = cookieParts.map((c) => `${c.name}=${c.value}`).join("; ");

// ----- 3) Probe protected pages -----
const pages = [
  "/ar/dashboard",
  "/ar/dashboard/links",
  "/ar/dashboard/links/new",
  "/ar/dashboard/campaigns",
  "/ar/dashboard/analytics",
  "/ar/dashboard/wallet",
  "/ar/dashboard/telegram",
  "/ar/dashboard/api-keys",
  "/ar/dashboard/settings",
  "/ar/admin",
  "/ar/admin/domains",
  "/ar/admin/users",
  "/ar/admin/transactions",
  "/ar/admin/settings",
  "/ar/admin/audit",
];

let failures = 0;
for (const path of pages) {
  const res = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  const ok = res.status >= 200 && res.status < 400;
  const mark = ok ? "✅" : "❌";
  if (!ok) failures++;
  console.log(`${mark} ${res.status}  ${path}`);
  if (!ok) {
    const body = await res.text();
    console.log("   →", body.slice(0, 250).replace(/\s+/g, " "));
  }
}

// ----- 4) Generate a service-side API key for the admin and hit /api/v1 -----
console.log("\n→ Provisioning API key for /api/v1 tests");
const userId = signin.user.id;
const plaintext = "sk_live_" + randomBytes(20).toString("hex");
const keyHash = createHash("sha256").update(plaintext).digest("hex");
const { error: keyErr } = await adminSb.from("api_keys").insert({
  user_id: userId,
  key_hash: keyHash,
  prefix: plaintext.slice(0, 14) + "…" + plaintext.slice(-4),
  name: "smoke-test",
  scopes: ["*"],
});
if (keyErr) {
  console.error("❌ insert api_key failed:", keyErr);
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${plaintext}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log("→ GET  /api/v1/wallet/balance");
const balance = await api("GET", "/api/v1/wallet/balance");
console.log(`   ${balance.status}`, balance.body);

console.log("→ POST /api/v1/links");
const created = await api("POST", "/api/v1/links", {
  destination_url: "https://example.com/long/path",
  title: "Smoke test",
});
console.log(`   ${created.status}`, created.body);

if (created.status === 201 && created.body?.data?.id) {
  const linkId = created.body.data.id;
  const slug = created.body.data.slug;
  console.log(`   → short slug: ${slug}`);

  console.log("→ GET  /api/v1/links/" + linkId);
  const fetched = await api("GET", `/api/v1/links/${linkId}`);
  console.log(`   ${fetched.status}`, fetched.body?.data ? "(ok)" : fetched.body);

  console.log("→ Test redirect engine /api/r/" + slug + "?__host=localhost");
  const redir = await fetch(`${base}/api/r/${slug}?__host=localhost`, { redirect: "manual" });
  console.log(`   ${redir.status} location=${redir.headers.get("location") || "(none)"}`);

  console.log("→ DELETE /api/v1/links/" + linkId);
  const deleted = await api("DELETE", `/api/v1/links/${linkId}`);
  console.log(`   ${deleted.status}`, deleted.body);
} else {
  failures++;
}

// Cleanup: drop the smoke-test key
await adminSb.from("api_keys").delete().eq("key_hash", keyHash);
console.log("\n✅ smoke-test API key cleaned up");

if (failures > 0) {
  console.log(`\n❌ ${failures} failure(s) above`);
  process.exit(1);
}
console.log("\n🎉 All probes passed.");
