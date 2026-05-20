import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Globe2, Target, Send, Code2 } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tCommon = await getTranslations("Common");

  const features = [
    { icon: Globe2, title: t("feature1Title"), body: t("feature1Body") },
    { icon: Target, title: t("feature2Title"), body: t("feature2Body") },
    { icon: Send, title: t("feature3Title"), body: t("feature3Body") },
    { icon: Code2, title: t("feature4Title"), body: t("feature4Body") },
  ];

  return (
    <div>
      <section className="container mx-auto px-4 py-20 text-center max-w-4xl">
        <p className="text-brand-500 font-medium mb-3 text-sm uppercase tracking-wide">
          {tCommon("appName")} · {tCommon("tagline")}
        </p>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          {t("heroTitle")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t("heroSubtitle")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/#features"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 hover:border-brand-300 transition"
            >
              <f.icon className="size-8 text-brand-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
