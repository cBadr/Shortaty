"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  full_name: z.string().max(200).optional(),
  language: z.enum(["ar", "en"]).optional(),
});

export async function updateProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

const passwordSchema = z.object({
  password: z.string().min(8).max(200),
});

export async function changePassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { ok: true };
}
