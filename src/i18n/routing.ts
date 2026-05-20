import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeConfig: Record<Locale, { name: string; dir: "rtl" | "ltr"; flag: string }> = {
  ar: { name: "العربية", dir: "rtl", flag: "🇸🇦" },
  en: { name: "English", dir: "ltr", flag: "🇬🇧" },
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
