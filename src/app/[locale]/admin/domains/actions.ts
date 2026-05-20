"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDomain, getDomain, removeDomain, verifyDomain } from "@/lib/vercel/domains";

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile as { role?: string } | null)?.role === "admin" ? user.id : null;
}

const hostnameSchema = z
  .string()
  .toLowerCase()
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/, "Invalid hostname");

export async function addDomainAction(formData: FormData): Promise<{ error?: string; id?: string }> {
  const userId = await requireAdmin();
  if (!userId) return { error: "Unauthorized" };

  const parsed = hostnameSchema.safeParse(formData.get("hostname"));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid hostname" };
  const hostname = parsed.data;
  const isDefault = formData.get("is_default") === "true";

  let vercelDomainId: string | undefined;
  try {
    const v = await addDomain(hostname);
    vercelDomainId = v.name;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vercel API error";
    // Continue inserting locally even if Vercel returns "already exists" — admins may pre-configure
    if (!/already (exists|in use)/i.test(message)) {
      return { error: message };
    }
  }

  const sb = createAdminClient();

  if (isDefault) {
    await sb.from("domains").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await sb
    .from("domains")
    .insert({
      hostname,
      status: "verifying",
      vercel_domain_id: vercelDomainId ?? hostname,
      vercel_project_id: process.env.VERCEL_PROJECT_ID,
      is_default: isDefault,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/domains");
  return { id: data.id as string };
}

export async function verifyDomainAction(hostname: string): Promise<{ error?: string; status?: string }> {
  const userId = await requireAdmin();
  if (!userId) return { error: "Unauthorized" };

  try {
    const v = await verifyDomain(hostname);
    const sb = createAdminClient();
    const newStatus = v.verified ? "active" : "verifying";
    await sb
      .from("domains")
      .update({ status: newStatus, dns_configured: v.verified })
      .eq("hostname", hostname);
    revalidatePath("/admin/domains");
    return { status: newStatus };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed" };
  }
}

export async function refreshDomainAction(hostname: string): Promise<{ error?: string }> {
  const userId = await requireAdmin();
  if (!userId) return { error: "Unauthorized" };
  try {
    const v = await getDomain(hostname);
    const sb = createAdminClient();
    await sb
      .from("domains")
      .update({
        status: v.verified ? "active" : "verifying",
        dns_configured: v.verified,
      })
      .eq("hostname", hostname);
    revalidatePath("/admin/domains");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refresh failed" };
  }
}

export async function deleteDomainAction(hostname: string): Promise<{ error?: string }> {
  const userId = await requireAdmin();
  if (!userId) return { error: "Unauthorized" };

  try {
    await removeDomain(hostname);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vercel removal failed";
    if (!/not found/i.test(message)) return { error: message };
  }

  const sb = createAdminClient();
  await sb.from("domains").delete().eq("hostname", hostname);
  revalidatePath("/admin/domains");
  return {};
}
