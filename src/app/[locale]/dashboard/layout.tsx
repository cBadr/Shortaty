import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = (profile as { role?: string } | null)?.role === "admin";

  return (
    <>
      <Nav />
      <div className="flex">
        <DashboardSidebar isAdmin={isAdmin} />
        <main className="flex-1 p-6 max-w-6xl">{children}</main>
      </div>
    </>
  );
}
