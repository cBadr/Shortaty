import "./globals.css";

export const metadata = {
  title: {
    default: "Shortaty — شورتاتي",
    template: "%s · Shortaty",
  },
  description: "Smart multi-domain URL shortener for marketers · منصة اختصار الروابط الذكية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
