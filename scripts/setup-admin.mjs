#!/usr/bin/env node
/**
 * Bootstraps a Shortaty admin account on the Supabase project configured
 * in .env.local.
 *
 * Steps:
 *   1. Verify the schema is in place (profiles table exists).
 *   2. Create a Supabase Auth user with email_confirm=true.
 *   3. Promote that user to role='admin' in public.profiles.
 *
 * If the schema is missing, prints the path to the SQL files for the user to
 * paste into Supabase SQL Editor.
 *
 * Usage:  node scripts/setup-admin.mjs [<email> <password>]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ----- Load .env.local manually (no dotenv dep) -----
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
let envText = "";
try {
  envText = readFileSync(envPath, "utf8");
} catch {
  console.error("❌ .env.local not found at", envPath);
  process.exit(1);
}
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let val = m[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[m[1]] = val;
}

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY || SUPA_URL.includes("placeholder")) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const sb = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ----- 1) Schema check -----
console.log("🔍 Checking schema on", SUPA_URL);
const { error: schemaErr } = await sb.from("profiles").select("id").limit(1);
if (schemaErr) {
  if (schemaErr.code === "42P01" || /relation .* does not exist/i.test(schemaErr.message)) {
    console.error("\n❌ Schema not initialized. The 'profiles' table is missing.\n");
    console.log("Please open the Supabase SQL editor and run, in order:");
    const ref = SUPA_URL.replace("https://", "").split(".")[0];
    console.log(`   https://supabase.com/dashboard/project/${ref}/sql/new\n`);
    console.log("   1) supabase/migrations/0001_init.sql");
    console.log("   2) supabase/migrations/0002_link_functions.sql");
    console.log("   3) supabase/migrations/0003_rollup.sql\n");
    console.log("Then re-run:  node scripts/setup-admin.mjs");
    process.exit(2);
  }
  console.error("❌ Unexpected schema check error:", schemaErr);
  process.exit(1);
}
console.log("✅ Schema looks good (profiles table reachable)");

// ----- 2) Pick credentials -----
const email = process.argv[2] || env.ADMIN_EMAIL || "admin@shortaty.com";
const password = process.argv[3] || env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");

// ----- 3) Look up or create the auth user -----
let userId;
{
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.error("❌ listUsers failed:", listErr);
    process.exit(1);
  }
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    userId = existing.id;
    console.log(`ℹ️  User already exists: ${email} (id=${userId.slice(0, 8)}…)`);
    if (process.argv[3]) {
      const { error: pwErr } = await sb.auth.admin.updateUserById(userId, { password });
      if (pwErr) {
        console.error("❌ Failed to reset password:", pwErr);
        process.exit(1);
      }
      console.log("🔑 Password was reset to the value you passed.");
    } else {
      console.log("   Password unchanged. Pass one as the 2nd arg to reset it.");
    }
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Shortaty Admin" },
    });
    if (createErr || !created.user) {
      console.error("❌ createUser failed:", createErr);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`✅ Created auth user: ${email}`);
  }
}

// ----- 4) Ensure a profile row + promote to admin -----
{
  const { data: profile } = await sb.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) {
    const { error: insertErr } = await sb.from("profiles").insert({
      id: userId,
      email,
      full_name: "Shortaty Admin",
      role: "admin",
    });
    if (insertErr) {
      console.error("❌ profile insert failed:", insertErr);
      process.exit(1);
    }
    console.log("✅ Inserted profile row");
  } else {
    const { error: updErr } = await sb.from("profiles").update({ role: "admin" }).eq("id", userId);
    if (updErr) {
      console.error("❌ failed to promote profile:", updErr);
      process.exit(1);
    }
    console.log("✅ Promoted existing profile to admin");
  }
}

// ----- 5) Output credentials -----
console.log("\n========================================");
console.log("  Shortaty admin account ready");
console.log("========================================");
console.log("  Login URL:  http://localhost:3000/ar/login");
console.log("  Email:     ", email);
console.log("  Password:  ", password);
console.log("  Role:       admin");
console.log("========================================\n");
console.log("Save this password — it is shown only once.");
