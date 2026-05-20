import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shortaty.com";
  const now = new Date();

  const paths = ["", "pricing", "docs"];
  const locales = ["ar", "en"];

  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    for (const locale of locales) {
      const url = `${baseUrl}/${locale}${path ? "/" + path : ""}`;
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "weekly",
        priority: path === "" ? 1.0 : 0.7,
        alternates: {
          languages: {
            ar: `${baseUrl}/ar${path ? "/" + path : ""}`,
            en: `${baseUrl}/en${path ? "/" + path : ""}`,
          },
        },
      });
    }
  }

  return entries;
}
