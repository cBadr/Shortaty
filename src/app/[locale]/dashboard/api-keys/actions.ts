"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.string().optional(),
  expires_days: z.coerce.number().int().min(1).max(3650).optional().nullable(),
});

export async function createApiKey(
  formData: FormData
): Promise<{ error?: string; plaintext?: string; prefix?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v === "" ? undefined : v])
  );
  const parsed = createSchema.safeParse(cleaned);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const generated = await generateApiKey("live");
  const scopes = parsed.data.scopes
    ? parsed.data.scopes.split(",").map((s) => s.trim()).filter(Boolean)
    : ["*"];
  const expiresAt = parsed.data.expires_days
    ? new Date(Date.now() + parsed.data.expires_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    key_hash: generated.hash,
    prefix: generated.prefix,
    name: parsed.data.name,
    scopes,
    expires_at: expiresAt,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/api-keys");
  return { plaintext: generated.plaintext, prefix: generated.prefix };
}

export async function revokeApiKey(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("api_keys").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/api-keys");
}
