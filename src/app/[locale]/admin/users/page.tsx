import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  credits_balance: number;
  is_active: boolean;
  created_at: string;
  telegram_verified: boolean;
}

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,credits_balance,is_active,created_at,telegram_verified")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <UsersTable users={(data ?? []) as UserRow[]} />
    </div>
  );
}
