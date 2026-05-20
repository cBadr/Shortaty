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

export async function setUserRole(userId: string, role: "admin" | "user"): Promise<void> {
  if (!(await requireAdmin())) return;
  const sb = createAdminClient();
  await sb.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  if (!(await requireAdmin())) return;
  const sb = createAdminClient();
  await sb.from("profiles").update({ is_active: isActive }).eq("id", userId);
  revalidatePath("/admin/users");
}

const adjustSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.coerce.number().refine((n) => n !== 0, "Amount must be non-zero"),
  description: z.string().max(200).default("Admin adjustment"),
});

export async function adjustCredits(
  formData: FormData
): Promise<{ error?: string; balance?: number }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Unauthorized" };

  const parsed = adjustSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("add_credits", {
    p_user_id: parsed.data.user_id,
    p_amount: parsed.data.amount,
    p_type: "admin_adjust",
    p_description: parsed.data.description,
    p_reference: adminId,
    p_metadata: { admin_id: adminId },
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { balance: Number(data) };
}
