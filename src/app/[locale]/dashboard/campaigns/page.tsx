import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CampaignsPanel } from "./campaigns-panel";

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  link_count: number;
}

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("campaigns")
    .select("id,name,description,color,created_at, links(count)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const campaigns = ((data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: (c.description as string | null) ?? null,
    color: (c.color as string | null) ?? "#3b82f6",
    created_at: c.created_at as string,
    link_count: ((c.links as Array<{ count: number }> | null)?.[0]?.count ?? 0),
  })) satisfies CampaignRow[];

  return <CampaignsPanel campaigns={campaigns} />;
}
