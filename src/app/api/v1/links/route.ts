import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api-auth";
import { defaultSlug, isValidSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  destination_url: z.string().url().max(2048),
  domain_id: z.string().uuid().optional(),
  domain: z.string().optional(), // hostname alternative
  slug: z.string().optional(),
  title: z.string().max(200).optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  redirect_type: z.number().int().refine((n) => n === 301 || n === 302).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  max_clicks: z.number().int().positive().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
});

export const GET = withApiAuth("links:read", async (request, ctx) => {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const sb = createAdminClient();
  const { data } = await sb
    .from("links")
    .select("id,slug,title,default_destination_url,total_clicks,unique_clicks,is_active,created_at,domain_id,campaign_id,redirect_type")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return NextResponse.json({ data });
});

export const POST = withApiAuth("links:write", async (request, ctx) => {
  const sb = createAdminClient();
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const input = parsed.data;

  // Resolve domain
  let domainId = input.domain_id;
  if (!domainId) {
    let q = sb.from("domains").select("id, hostname").eq("status", "active");
    q = input.domain ? q.eq("hostname", input.domain) : q.eq("is_default", true);
    const { data: dom } = await q.maybeSingle();
    const d = dom as { id: string } | null;
    if (!d) {
      return NextResponse.json({ error: "No active domain found" }, { status: 400 });
    }
    domainId = d.id;
  }

  let slug = input.slug?.trim() || defaultSlug();
  if (input.slug && !isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await sb
      .from("links")
      .insert({
        user_id: ctx.userId,
        domain_id: domainId,
        slug,
        title: input.title ?? null,
        default_destination_url: input.destination_url,
        campaign_id: input.campaign_id ?? null,
        redirect_type: input.redirect_type ?? 302,
        expires_at: input.expires_at ?? null,
        max_clicks: input.max_clicks ?? null,
        utm_source: input.utm_source ?? null,
        utm_medium: input.utm_medium ?? null,
        utm_campaign: input.utm_campaign ?? null,
      })
      .select("id, slug, default_destination_url, domain_id")
      .single();

    if (!error) {
      const { data: dom } = await sb.from("domains").select("hostname").eq("id", domainId).maybeSingle();
      const hostname = (dom as { hostname?: string } | null)?.hostname;
      return NextResponse.json({
        data: {
          ...data,
          short_url: hostname ? `https://${hostname}/${(data as { slug: string }).slug}` : null,
        },
      }, { status: 201 });
    }

    if (error.code === "23505" && !input.slug && attempt === 0) {
      slug = defaultSlug();
      continue;
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Could not create link" }, { status: 500 });
});
