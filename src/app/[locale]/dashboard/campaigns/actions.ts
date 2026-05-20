"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function createCampaign(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v === "" ? undefined : v])
  );
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? "#3b82f6",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/campaigns");
  return { id: data.id as string };
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("campaigns").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/campaigns");
}
