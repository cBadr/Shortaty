import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user.email}</p>
        <div className="mt-8 p-8 bg-card border border-border rounded-xl text-center text-muted-foreground">
          Dashboard features will be built in Phase 2 onwards.
        </div>
      </main>
    </>
  );
}
