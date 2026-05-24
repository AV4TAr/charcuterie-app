import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const tErr = await getTranslations("errors");

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("login")}</CardTitle>
          <CardDescription>{tErr("comingSoon")}</CardDescription>
        </CardHeader>
        <p className="text-sm text-zinc-400">
          {locale === "es"
            ? "El login con email y Google se conecta en el siguiente paso (necesita un proyecto Supabase con las credenciales en .env.local). El esquema de la base ya está listo en supabase/migrations/."
            : "Email and Google login will be wired up in the next step (requires a Supabase project with credentials in .env.local). The database schema is already in supabase/migrations/."}
        </p>
      </Card>
    </div>
  );
}
