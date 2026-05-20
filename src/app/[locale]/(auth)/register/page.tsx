import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./register-form";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-center">{t("registerTitle")}</h1>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-brand-500 hover:underline">
          {t("loginButton")}
        </Link>
      </p>
    </div>
  );
}
