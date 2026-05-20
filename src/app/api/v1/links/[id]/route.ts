import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  destination_url: z.string().url().optional(),
  title: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
  redirect_type: z.number().int().refine((n) => n === 301 || n === 302).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  max_clicks: z.number().int().positive().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
});

export const GET = withApiAuth("links:read", async (_request, ctx, params) => {
  const sb = createAdminClient();
  const { data } = await sb
    .from("links")
    .select("*, domain:domains(hostname), rules:link_rules(id, priority, name, conditions, destination_url, is_active)")
    .eq("id", params.id)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
});

export const PATCH = withApiAuth("links:write", async (request, ctx, params) => {
  const sb = createAdminClient();
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const payload: Record<string, unknown> = { ...parsed.data };
  if ("destination_url" in payload) {
    payload.default_destination_url = payload.destination_url;
    delete payload.destination_url;
  }

  const { data, error } = await sb
    .from("links")
    .update(payload)
    .eq("id", params.id)
    .eq("user_id", ctx.userId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
});

export const DELETE = withApiAuth("links:write", async (_request, ctx, params) => {
  const sb = createAdminClient();
  const { error } = await sb.from("links").delete().eq("id", params.id).eq("user_id", ctx.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
});
