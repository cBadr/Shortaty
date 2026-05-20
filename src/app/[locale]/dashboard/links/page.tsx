import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Plus, ExternalLink } from "lucide-react";

interface LinkRow {
  id: string;
  slug: string;
  title: string | null;
  default_destination_url: string;
  total_clicks: number;
  unique_clicks: number;
  is_active: boolean;
  created_at: string;
  domain: { hostname: string } | null;
}

export default async function LinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Links");
  const tc = await getTranslations("Common");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("links")
    .select("id,slug,title,default_destination_url,total_clicks,unique_clicks,is_active,created_at,domain:domains(hostname)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const links = (data ?? []) as unknown as LinkRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/dashboard/links/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-md text-sm hover:bg-brand-600"
        >
          <Plus className="size-4" />
          {t("newLink")}
        </Link>
      </div>

      {links.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {t("noLinks")}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-start">
                <th className="px-4 py-3 text-start font-medium">{t("shortUrl")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("destination")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("clicks")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("created")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const shortUrl = link.domain
                  ? `https://${link.domain.hostname}/${link.slug}`
                  : `/${link.slug}`;
                return (
                  <tr key={link.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="text-brand-500 hover:underline"
                      >
                        {link.domain?.hostname}/{link.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3 truncate max-w-xs text-muted-foreground">
                      {link.default_destination_url}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{link.total_clicks}</span>
                      <span className="text-muted-foreground text-xs"> / {link.unique_clicks} {tc("yes") /* unique */}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(link.created_at).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3">
                      <a href={shortUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-500">
                        <ExternalLink className="size-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
