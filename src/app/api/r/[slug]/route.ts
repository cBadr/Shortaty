import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildVisitorContext } from "@/lib/targeting/visitor";
import { pickRule } from "@/lib/targeting/rules-engine";
import type { LinkRule } from "@/lib/targeting/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  user_id: string;
  domain_id: string;
  slug: string;
  title: string | null;
  default_destination_url: string;
  redirect_type: number;
  is_active: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  total_clicks: number;
  is_cloaked: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  password_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function appendUtm(url: string, link: LinkRow): string {
  if (!link.utm_source && !link.utm_medium && !link.utm_campaign) return url;
  try {
    const u = new URL(url);
    if (link.utm_source) u.searchParams.set("utm_source", link.utm_source);
    if (link.utm_medium) u.searchParams.set("utm_medium", link.utm_medium);
    if (link.utm_campaign) u.searchParams.set("utm_campaign", link.utm_campaign);
    if (link.utm_term) u.searchParams.set("utm_term", link.utm_term);
    if (link.utm_content) u.searchParams.set("utm_content", link.utm_content);
    return u.toString();
  } catch {
    return url;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function botPreviewResponse(link: LinkRow, destination: string) {
  const title = escapeHtml(link.og_title || link.title || "Shortaty");
  const description = escapeHtml(link.og_description || "Smart shortened link");
  const image = link.og_image ? escapeHtml(link.og_image) : "";
  const dest = escapeHtml(destination);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${image ? `<meta property="og:image" content="${image}" />` : ""}
<meta property="og:url" content="${dest}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ""}
<link rel="canonical" href="${dest}" />
</head>
<body>
<p>Redirecting to <a href="${dest}">${dest}</a>...</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const headerHost = request.headers.get("host") || "";
  const host = (url.searchParams.get("__host") || headerHost).split(":")[0].toLowerCase();

  const sb = admin();

  const { data: domain } = await sb
    .from("domains")
    .select("id, status")
    .eq("hostname", host)
    .maybeSingle();

  if (!domain || domain.status !== "active") {
    return new NextResponse("Link not found", { status: 404 });
  }

  const { data: link } = await sb
    .from("links")
    .select(
      "id,user_id,domain_id,slug,title,default_destination_url,redirect_type,is_active,expires_at,max_clicks,total_clicks,is_cloaked,og_title,og_description,og_image,password_hash,utm_source,utm_medium,utm_campaign,utm_term,utm_content"
    )
    .eq("domain_id", domain.id)
    .eq("slug", slug)
    .maybeSingle<LinkRow>();

  if (!link || !link.is_active) {
    return new NextResponse("Link not found", { status: 404 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new NextResponse("This link has expired", { status: 410 });
  }
  if (link.max_clicks && link.total_clicks >= link.max_clicks) {
    return new NextResponse("This link has reached its click limit", { status: 410 });
  }

  const { data: rulesData } = await sb
    .from("link_rules")
    .select("id, link_id, priority, conditions, destination_url, is_active")
    .eq("link_id", link.id)
    .eq("is_active", true);

  const rules: LinkRule[] = (rulesData || []).map((r) => ({
    id: r.id as string,
    priority: r.priority as number,
    conditions: r.conditions as LinkRule["conditions"],
    destination_url: r.destination_url as string,
    is_active: r.is_active as boolean,
  }));

  const visitorCookie = request.cookies.get("st_v")?.value || null;
  const visitor = await buildVisitorContext(request, visitorCookie);

  const matched = pickRule(rules, visitor);
  let destination = matched?.destination_url || link.default_destination_url;
  destination = appendUtm(destination, link);

  const isUnique = visitor.visitorType === "new";

  // Fire-and-forget: log click + increment counters + deduct credits
  after(async () => {
    try {
      await sb.from("clicks").insert({
        link_id: link.id,
        rule_id: matched?.id ?? null,
        user_agent: visitor.device.userAgent,
        browser: visitor.device.browser,
        browser_version: visitor.device.browserVersion,
        os: visitor.device.os,
        os_version: visitor.device.osVersion,
        device_type: visitor.device.type,
        device_vendor: visitor.device.vendor,
        ip_hash: visitor.fingerprint,
        country: visitor.geo.country,
        region: visitor.geo.region,
        city: visitor.geo.city,
        timezone: visitor.geo.timezone,
        referrer: visitor.referrer,
        referrer_domain: visitor.referrerDomain,
        language: visitor.language,
        utm_source: visitor.utm.source,
        utm_medium: visitor.utm.medium,
        utm_campaign: visitor.utm.campaign,
        utm_term: visitor.utm.term,
        utm_content: visitor.utm.content,
        is_bot: visitor.bot.isBot,
        bot_name: visitor.bot.name,
        is_vpn: visitor.isVpn,
        is_proxy: visitor.isProxy,
        destination_url: destination,
        status_code: visitor.bot.isPreview ? 200 : link.redirect_type,
        is_unique: isUnique,
        visitor_fingerprint: visitor.fingerprint,
      });

      await sb.rpc("increment_link_clicks", {
        p_link_id: link.id,
        p_is_unique: isUnique,
      });

      // Deduct credits only for real (non-bot) clicks
      if (!visitor.bot.isBot) {
        const { data: setting } = await sb
          .from("system_settings")
          .select("value")
          .eq("key", "cost_per_click")
          .maybeSingle();
        const cost = parseFloat((setting?.value as string) ?? "0");
        if (cost > 0) {
          await sb.rpc("deduct_credits", {
            p_user_id: link.user_id,
            p_amount: cost,
            p_description: `click on /${slug}`,
            p_reference: link.id,
            p_metadata: { type: "click" },
          });
        }
      }
    } catch (err) {
      console.error("[redirect] background task failed", err);
    }
  });

  if (visitor.bot.isPreview) {
    return botPreviewResponse(link, destination);
  }

  const response = NextResponse.redirect(destination, link.redirect_type === 301 ? 301 : 302);

  if (visitor.visitorType === "new") {
    response.cookies.set("st_v", visitor.fingerprint, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
