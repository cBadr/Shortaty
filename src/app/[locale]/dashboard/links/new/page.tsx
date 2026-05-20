import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { NewLinkForm } from "./new-link-form";

export default async function NewLinkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Links");

  const supabase = await createClient();
  const { data: domains } = await supabase
    .from("domains")
    .select("id, hostname, is_default")
    .eq("status", "active")
    .order("is_default", { ascending: false });

  const domainList = (domains ?? []) as { id: string; hostname: string; is_default: boolean }[];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t("newLink")}</h1>
      <NewLinkForm domains={domainList} />
    </div>
  );
}
