import "./globals.css";
import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shortaty.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Shortaty — شورتاتي · Smart URL Shortener",
    template: "%s · Shortaty",
  },
  description:
    "Shortaty (شورتاتي) — smart multi-domain URL shortener for marketers. Device/geo targeting, Telegram notifications, REST API, pro analytics.",
  keywords: [
    "URL shortener",
    "اختصار روابط",
    "shortaty",
    "شورتاتي",
    "marketing",
    "deep linking",
    "smart links",
    "analytics",
    "geo targeting",
    "telegram bot",
  ],
  authors: [{ name: "Shortaty" }],
  applicationName: "Shortaty",
  generator: "Next.js",
  openGraph: {
    type: "website",
    siteName: "Shortaty",
    locale: "ar_EG",
    alternateLocale: ["en_US"],
    url: baseUrl,
    title: "Shortaty — شورتاتي · Smart URL Shortener",
    description:
      "Smart multi-domain URL shortener with device/geo targeting, Telegram notifications, and a pro REST API.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shortaty — شورتاتي",
    description: "Smart URL shortener for marketers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      ar: `${baseUrl}/ar`,
      en: `${baseUrl}/en`,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
