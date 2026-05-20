import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

interface Profile {
  email: string;
  full_name: string | null;
  language: string;
  role: string;
  created_at: string;
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("email,full_name,language,role,created_at")
    .eq("id", user!.id)
    .maybeSingle();
  const profile = data as Profile | null;

  return <SettingsForm profile={profile} />;
}
