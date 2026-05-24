import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const tErr = await getTranslations("errors");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("newRecipe")}</CardTitle>
        <CardDescription>{tErr("comingSoon")}</CardDescription>
      </CardHeader>
      <p className="text-sm text-zinc-400">
        {locale === "es"
          ? "El editor completo de recetas se construye sobre las tablas recipes / recipe_versions / recipe_version_ingredients ya definidas en supabase/migrations/. Necesita auth conectada para persistir."
          : "The full recipe editor sits on top of the recipes / recipe_versions / recipe_version_ingredients tables already defined in supabase/migrations/. It needs auth wired up to persist."}
      </p>
    </Card>
  );
}
