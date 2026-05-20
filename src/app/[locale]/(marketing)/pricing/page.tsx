import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Check } from "lucide-react";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations("Common");

  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["cost_per_click", "credits_per_usd", "signup_bonus_credits"]);

  const settings = ((data ?? []) as Array<{ key: string; value: unknown }>).reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.key] = parseFloat(String(r.value));
      return acc;
    },
    {}
  );

  const costPerClick = settings.cost_per_click ?? 0.001;
  const creditsPerUsd = settings.credits_per_usd ?? 1000;
  const signupBonus = settings.signup_bonus_credits ?? 5;
  const clicksPerUsd = Math.floor(creditsPerUsd / costPerClick);

  const features = [
    "Unlimited short links",
    "Smart device & geo targeting",
    "All custom domains",
    "Pro analytics dashboard",
    "Telegram notifications (your own bot)",
    "REST API access",
    "CSV export",
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">Pay only for what you use</h1>
      <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
        No subscriptions. No tiers. Top up your wallet with crypto and pay per click.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Free start</div>
          <div className="text-4xl font-bold mb-1">{signupBonus}</div>
          <div className="text-sm text-muted-foreground mb-6">credits on signup</div>
          <p className="text-sm text-muted-foreground mb-6">
            Try every feature without paying anything. About {Math.floor(signupBonus / costPerClick)} clicks free.
          </p>
        </div>

        <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-8 ring-2 ring-brand-500 md:scale-105">
          <div className="text-sm opacity-80 uppercase tracking-wide mb-2">Pay as you go</div>
          <div className="text-4xl font-bold mb-1">${(costPerClick * 1000).toFixed(2)}</div>
          <div className="text-sm opacity-80 mb-6">per 1,000 clicks</div>
          <Link
            href="/register"
            className="block w-full py-2 bg-white text-brand-700 rounded-md font-medium hover:bg-white/90 mb-6"
          >
            Start free
          </Link>
          <ul className="text-sm space-y-2 text-start">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Volume</div>
          <div className="text-4xl font-bold mb-1">{clicksPerUsd.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mb-6">clicks per $1</div>
          <p className="text-sm text-muted-foreground mb-6">
            Top up with USDT, BTC, ETH, LTC or DOGE. Credits never expire.
          </p>
        </div>
      </div>
    </div>
  );
}
