import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { RecipeForm } from "./recipe-form";

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/login", locale });

  const { data: ingredients = [] } = await supabase
    .from("ingredients")
    .select("id, name, name_es, name_en, measurement_type, default_density_g_per_ml, category")
    .order("category")
    .order("name");

  const t = await getTranslations("nav");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="serif" style={{ fontSize: 32, margin: "0 0 32px", color: "var(--ink)" }}>{t("newRecipe")}</h1>
      <RecipeForm locale={locale} ingredients={ingredients ?? []} userId={user!.id} />
    </div>
  );
}
