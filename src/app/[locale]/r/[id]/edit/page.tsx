import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm, type RecipeFormValues } from "@/app/[locale]/new/recipe-form";
import { fromCanonical, type MassUnit } from "@/lib/units";
import type { Locale } from "@/lib/i18n/config";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title, description, visibility, owner_id, current_version_id")
    .eq("id", id)
    .single();

  if (!recipe) notFound();
  if (recipe.owner_id !== user!.id) notFound();

  const { data: version } = await supabase
    .from("recipe_versions")
    .select("id, version_number, meat_base_weight_grams, meat_base_display_unit, instructions")
    .eq("id", recipe.current_version_id!)
    .single();

  if (!version) notFound();

  const { data: rows = [] } = await supabase
    .from("recipe_version_ingredients")
    .select("ingredient_id, mode, percent_of_meat, amount_canonical, display_unit, sort_order")
    .eq("version_id", version.id)
    .order("sort_order");

  const meatUnit = (version.meat_base_display_unit ?? "kg") as MassUnit;
  const meatValue = fromCanonical(Number(version.meat_base_weight_grams), meatUnit);

  const { data: ingredients = [] } = await supabase
    .from("ingredients")
    .select("id, name, measurement_type, default_density_g_per_ml, category")
    .order("category")
    .order("name");

  const t = await getTranslations("recipe");

  const initialValues: Partial<RecipeFormValues> = {
    title: recipe.title,
    description: recipe.description ?? "",
    visibility: recipe.visibility as "public" | "private",
    meatBaseValue: String(meatValue),
    meatBaseUnit: meatUnit,
    instructions: version.instructions ?? "",
    rows: (rows ?? []).map((r) => {
      const ing = ingredients?.find((i) => i.id === r.ingredient_id);
      const displayUnit = r.display_unit as string;
      let value = "0";
      if (r.mode === "percent" && r.percent_of_meat != null) {
        value = String(Number(r.percent_of_meat) * 100);
      } else if (r.amount_canonical != null && ing) {
        value = String(fromCanonical(Number(r.amount_canonical), displayUnit as never));
      }
      return {
        ingredientId: r.ingredient_id,
        mode: r.mode as "percent" | "absolute",
        value,
        displayUnit,
      };
    }),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t("edit")}: {recipe.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">{t("version", { number: version.version_number })} → v{version.version_number + 1}</p>
      <RecipeForm
        locale={locale}
        ingredients={ingredients ?? []}
        userId={user!.id}
        editing={{ recipeId: recipe.id, currentVersionNumber: version.version_number }}
        initialValues={initialValues}
      />
    </div>
  );
}
