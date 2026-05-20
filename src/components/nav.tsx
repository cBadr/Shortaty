"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeConfig, type Locale } from "@/i18n/routing";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Languages, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export function Nav() {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();

  const otherLocale: Locale = locale === "ar" ? "en" : "ar";

  const switchLocale = () => {
    router.push(`/${otherLocale}${pathname}`);
  };

  return (
    <nav className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 max-w-6xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Zap className="size-5 text-brand-500" />
          <span>{tCommon("appName")}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-brand-500">{t("home")}</Link>
          <Link href="/#features" className="hover:text-brand-500">{t("features")}</Link>
          <Link href="/pricing" className="hover:text-brand-500">{t("pricing")}</Link>
          <Link href="/docs" className="hover:text-brand-500">{t("docs")}</Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={switchLocale}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted text-sm"
            aria-label="Switch language"
          >
            <Languages className="size-4" />
            <span>{localeConfig[otherLocale].name}</span>
          </button>
          <button
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-muted"
            aria-label="Toggle theme"
          >
            {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-sm hover:bg-muted"
          >
            {t("login")}
          </Link>
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-md bg-brand-500 text-white text-sm hover:bg-brand-600"
          >
            {t("register")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
