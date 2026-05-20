import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { AdminSidebar } from "./admin-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin") redirect(`/${locale}/dashboard`);

  return (
    <>
      <Nav />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 max-w-6xl">{children}</main>
      </div>
    </>
  );
}
