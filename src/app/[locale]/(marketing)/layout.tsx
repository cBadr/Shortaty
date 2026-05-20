import { Nav } from "@/components/nav";
import { setRequestLocale } from "next-intl/server";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
