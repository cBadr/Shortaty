import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LinkDetail } from "./link-detail";

interface LinkRow {
  id: string;
  slug: string;
  title: string | null;
  default_destination_url: string;
  redirect_type: number;
  is_active: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  total_clicks: number;
  unique_clicks: number;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  domain: { hostname: string } | null;
  campaign_id: string | null;
}

interface RuleRow {
  id: string;
  link_id: string;
  priority: number;
  name: string | null;
  conditions: Record<string, unknown>;
  destination_url: string;
  is_active: boolean;
}

export default async function LinkPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await getTranslations("Links"); // ensure namespace is loaded

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: linkData } = await supabase
    .from("links")
    .select(
      "id,slug,title,default_destination_url,redirect_type,is_active,expires_at,max_clicks,total_clicks,unique_clicks,og_title,og_description,og_image,utm_source,utm_medium,utm_campaign,campaign_id,domain:domains(hostname)"
    )
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!linkData) notFound();
  const link = linkData as unknown as LinkRow;

  const { data: rulesData } = await supabase
    .from("link_rules")
    .select("id,link_id,priority,name,conditions,destination_url,is_active")
    .eq("link_id", id)
    .order("priority", { ascending: true });

  const rules = (rulesData ?? []) as unknown as RuleRow[];

  return <LinkDetail link={link} rules={rules} />;
}
