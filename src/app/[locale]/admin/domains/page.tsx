import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DomainsTable } from "./domains-table";

interface DomainRow {
  id: string;
  hostname: string;
  status: string;
  vercel_domain_id: string | null;
  dns_configured: boolean;
  is_default: boolean;
  created_at: string;
}

export default async function AdminDomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("domains")
    .select("id,hostname,status,vercel_domain_id,dns_configured,is_default,created_at")
    .order("created_at", { ascending: false });

  const domains = (data ?? []) as unknown as DomainRow[];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Domains</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Add custom domains your users can shorten links on. The system registers them with Vercel automatically.
      </p>
      <DomainsTable domains={domains} />
    </div>
  );
}
