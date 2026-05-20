import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "./login-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-center">{t("loginTitle")}</h1>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-brand-500 hover:underline">
          {t("registerButton")}
        </Link>
      </p>
    </div>
  );
}
