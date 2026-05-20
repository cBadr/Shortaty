"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { defaultSlug, isValidSlug } from "@/lib/slug";

const createLinkSchema = z.object({
  domain_id: z.string().uuid(),
  slug: z.string().optional(),
  title: z.string().max(200).optional(),
  default_destination_url: z.string().url().max(2048),
  campaign_id: z.string().uuid().nullable().optional(),
  redirect_type: z.coerce.number().int().refine((n) => n === 301 || n === 302),
  expires_at: z.string().optional().nullable(),
  max_clicks: z.coerce.number().int().positive().optional().nullable(),
  utm_source: z.string().max(200).optional().nullable(),
  utm_medium: z.string().max(200).optional().nullable(),
  utm_campaign: z.string().max(200).optional().nullable(),
  og_title: z.string().max(200).optional().nullable(),
  og_description: z.string().max(500).optional().nullable(),
  og_image: z.string().url().max(2048).optional().nullable(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export async function createLink(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  // Normalise empty strings → undefined so zod's optional kicks in
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v === "" ? undefined : v])
  );

  const parsed = createLinkSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }
  const input = parsed.data;

  let slug = input.slug?.trim() || defaultSlug();
  if (input.slug && !isValidSlug(slug)) {
    return { error: "Invalid slug. Use 3–64 chars, letters, digits, '-' or '_'." };
  }

  // Try insert, retry once with a fresh random slug on conflict (only if auto-gen)
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("links")
      .insert({
        user_id: user.id,
        domain_id: input.domain_id,
        slug,
        title: input.title || null,
        default_destination_url: input.default_destination_url,
        campaign_id: input.campaign_id || null,
        redirect_type: input.redirect_type,
        expires_at: input.expires_at || null,
        max_clicks: input.max_clicks || null,
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
        og_title: input.og_title || null,
        og_description: input.og_description || null,
        og_image: input.og_image || null,
      })
      .select("id")
      .single();

    if (!error) {
      revalidatePath("/dashboard/links");
      return { id: data.id as string };
    }

    const isDup = error.code === "23505";
    if (isDup && !input.slug && attempt === 0) {
      slug = defaultSlug();
      continue;
    }

    return { error: isDup ? "This short code is already taken." : error.message };
  }

  return { error: "Could not create link." };
}

export async function deleteLink(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("links").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/links");
  redirect("/dashboard/links");
}

const updateLinkSchema = createLinkSchema.partial().extend({
  is_active: z.coerce.boolean().optional(),
});

export async function updateLink(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === "string" && v === "" ? undefined : v])
  );

  const parsed = updateLinkSchema.safeParse(cleaned);
  if (!parsed.success) return { error: parsed.error.errors.map((e) => e.message).join(", ") };

  const { error } = await supabase
    .from("links")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/links");
  revalidatePath(`/dashboard/links/${id}`);
  return {};
}
