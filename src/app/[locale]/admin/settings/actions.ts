"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile as { role?: string } | null)?.role === "admin" ? user.id : null;
}

const schema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(2000),
});

export async function updateSetting(formData: FormData): Promise<{ error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Unauthorized" };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(parsed.data.value);
  } catch {
    parsedValue = parsed.data.value;
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("system_settings")
    .update({ value: parsedValue, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq("key", parsed.data.key);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}
