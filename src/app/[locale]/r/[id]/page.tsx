import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { fromCanonical } from "@/lib/units";
import type { Locale } from "@/lib/i18n/config";
import type { RecipeIngredient } from "@/lib/recipes/calculator";
import type { MassUnit, Unit } from "@/lib/units";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, title, description, visibility, owner_id, favorites_count, created_at, profiles!owner_id(username, display_name), current_version_id")
    .eq("id", id)
    .single();

  if (error || !recipe || !recipe.current_version_id) notFound();

  const { data: version } = await supabase
    .from("recipe_versions")
    .select("id, version_number, meat_base_weight_grams, meat_base_display_unit, instructions, change_note")
    .eq("id", recipe.current_version_id)
    .single();

  if (!version) notFound();

  const { data: rows = [] } = await supabase
    .from("recipe_version_ingredients")
    .select("id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, notes, ingredients(id, name, measurement_type, default_density_g_per_ml)")
    .eq("version_id", version.id)
    .order("sort_order");

  const ingredients: RecipeIngredient[] = (rows ?? []).map((row) => {
    const ing = row.ingredients as unknown as { id: string; name: string; measurement_type: string; default_density_g_per_ml: number | null } | null;
    return {
      id: row.id,
      name: ing?.name ?? "?",
      measurementType: (ing?.measurement_type ?? "mass") as RecipeIngredient["measurementType"],
      defaultDensityGPerMl: ing?.default_density_g_per_ml ?? null,
      mode: row.mode as "percent" | "absolute",
      percentOfMeat: row.percent_of_meat != null ? Number(row.percent_of_meat) * 100 : null,
      amountCanonical: row.amount_canonical != null ? Number(row.amount_canonical) : null,
      displayUnit: row.display_unit as Unit,
      notes: row.notes ?? null,
      sortOrder: row.sort_order,
    };
  });

  const meatUnit = (version.meat_base_display_unit ?? "kg") as MassUnit;
  const initialMeatAmount = fromCanonical(Number(version.meat_base_weight_grams), meatUnit);
  const owner = recipe.profiles as unknown as { username: string; display_name: string | null } | null;
  const isOwner = user?.id === recipe.owner_id;

  let isFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipe.id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  const t = await getTranslations("recipe");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-zinc-100">{recipe.title}</h1>
          {recipe.description && <p className="text-zinc-400 mt-2">{recipe.description}</p>}
          <p className="text-xs text-zinc-600 mt-2">
            {t("by")} {owner?.display_name ?? owner?.username ?? "—"} · {t("version", { number: version.version_number })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton
            recipeId={recipe.id}
            userId={user?.id ?? null}
            initialIsFavorited={isFavorited}
            initialCount={recipe.favorites_count ?? 0}
          />
          {isOwner && (
            <Link
              href={`/r/${recipe.id}/edit`}
              className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition"
            >
              {t("edit")}
            </Link>
          )}
        </div>
      </div>

      {ingredients.length > 0 ? (
        <WeightCalculator
          ingredients={ingredients}
          initialMeatAmount={initialMeatAmount}
          initialMeatUnit={meatUnit}
          locale={locale}
        />
      ) : (
        <p className="text-zinc-500 text-sm">{t("noIngredients")}</p>
      )}

      {version.instructions && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">{t("instructions")}</h2>
          <p className="text-zinc-400 whitespace-pre-wrap text-sm">{version.instructions}</p>
        </div>
      )}
    </div>
  );
}
