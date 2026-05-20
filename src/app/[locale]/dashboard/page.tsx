import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Link2, Wallet, BarChart3, Send } from "lucide-react";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ count: linksCount }, { count: clicksCount }, { data: profile }] = await Promise.all([
    supabase.from("links").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("credits_balance, telegram_verified").eq("id", user!.id).maybeSingle(),
  ]);

  const balance = (profile as { credits_balance?: number } | null)?.credits_balance ?? 0;
  const telegramOk = (profile as { telegram_verified?: boolean } | null)?.telegram_verified ?? false;

  const cards = [
    { icon: Link2, label: t("links"), value: linksCount ?? 0, href: "/dashboard/links" },
    { icon: BarChart3, label: t("analytics"), value: clicksCount ?? 0, href: "/dashboard/analytics" },
    { icon: Wallet, label: t("wallet"), value: balance.toFixed(3), href: "/dashboard/wallet" },
    {
      icon: Send,
      label: t("telegram"),
      value: telegramOk ? "✓" : "—",
      href: "/dashboard/telegram",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t("welcome")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{user?.email}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-card border border-border rounded-xl p-4 hover:border-brand-300"
          >
            <c.icon className="size-5 text-brand-500 mb-2" />
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
