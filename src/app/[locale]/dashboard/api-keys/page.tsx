import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysPanel } from "./api-keys-panel";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("api_keys")
    .select("id,name,prefix,scopes,last_used_at,expires_at,created_at,is_active")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <ApiKeysPanel keys={(data ?? []) as KeyRow[]} />;
}
