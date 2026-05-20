import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SystemSettingsForm } from "./settings-form";

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key,value,description")
    .order("key");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">System Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Edit pricing and global thresholds. Changes take effect immediately.
      </p>
      <SystemSettingsForm settings={(data ?? []) as SettingRow[]} />
    </div>
  );
}
