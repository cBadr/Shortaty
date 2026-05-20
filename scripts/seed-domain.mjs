#!/usr/bin/env node
/**
 * Seeds a local development domain so links can be created and tested
 * against the dev server.
 *
 * Usage:
 *   node scripts/seed-domain.mjs              # adds "localhost" as default active domain
 *   node scripts/seed-domain.mjs go.example.com  # adds that hostname
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hostname = (process.argv[2] || "localhost").toLowerCase();

const { data: existing } = await sb.from("domains").select("id, status, is_default").eq("hostname", hostname).maybeSingle();

if (existing) {
  await sb.from("domains").update({ status: "active", dns_configured: true }).eq("hostname", hostname);
  console.log(`✅ Domain ${hostname} already exists — marked active.`);
} else {
  // Clear any existing default
  await sb.from("domains").update({ is_default: false }).eq("is_default", true);
  const { error } = await sb.from("domains").insert({
    hostname,
    status: "active",
    dns_configured: true,
    is_default: true,
    notes: "Seeded for local development",
  });
  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
  console.log(`✅ Added ${hostname} as active default domain.`);
  console.log(`   Test link: http://${hostname}:3000/<slug>`);
}
