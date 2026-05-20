"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ruleSchema = z.object({
  link_id: z.string().uuid(),
  priority: z.coerce.number().int().min(0).max(1000).default(10),
  name: z.string().max(200).optional().nullable(),
  destination_url: z.string().url().max(2048),
  conditions: z.string().transform((s, ctx) => {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        ctx.addIssue({ code: "custom", message: "conditions must be a JSON object" });
        return z.NEVER;
      }
      return parsed as Record<string, unknown>;
    } catch {
      ctx.addIssue({ code: "custom", message: "conditions must be valid JSON" });
      return z.NEVER;
    }
  }),
  is_active: z.coerce.boolean().default(true),
});

async function assertOwnsLink(linkId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("links").select("id").eq("id", linkId).eq("user_id", user.id).maybeSingle();
  return data ? user.id : null;
}

export async function createRule(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ruleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  if (!(await assertOwnsLink(parsed.data.link_id))) return { error: "unauthorized" };

  const { error } = await supabase.from("link_rules").insert({
    link_id: parsed.data.link_id,
    priority: parsed.data.priority,
    name: parsed.data.name ?? null,
    destination_url: parsed.data.destination_url,
    conditions: parsed.data.conditions,
    is_active: parsed.data.is_active,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/links/${parsed.data.link_id}`);
  return {};
}

export async function deleteRule(linkId: string, ruleId: string): Promise<void> {
  if (!(await assertOwnsLink(linkId))) return;
  const supabase = await createClient();
  await supabase.from("link_rules").delete().eq("id", ruleId).eq("link_id", linkId);
  revalidatePath(`/dashboard/links/${linkId}`);
}

export async function toggleRule(linkId: string, ruleId: string, active: boolean): Promise<void> {
  if (!(await assertOwnsLink(linkId))) return;
  const supabase = await createClient();
  await supabase.from("link_rules").update({ is_active: active }).eq("id", ruleId).eq("link_id", linkId);
  revalidatePath(`/dashboard/links/${linkId}`);
}
