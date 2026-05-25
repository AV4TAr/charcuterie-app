import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { RatingStars } from "@/components/recipe/rating-stars";
import { Comments, type CommentRow } from "@/components/recipe/comments";
import { ForkButton } from "@/components/recipe/fork-button";
import { VersionHistory, type VersionRow } from "@/components/recipe/version-history";
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
    .select("id, title, description, visibility, owner_id, favorites_count, ratings_avg, ratings_count, forked_from_recipe_id, created_at, profiles!owner_id(username, display_name), current_version_id")
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
  let userRating: number | null = null;
  if (user) {
    const [favRes, ratingRes] = await Promise.all([
      supabase.from("favorites").select("user_id").eq("user_id", user.id).eq("recipe_id", recipe.id).maybeSingle(),
      supabase.from("ratings").select("score").eq("user_id", user.id).eq("recipe_id", recipe.id).maybeSingle(),
    ]);
    isFavorited = !!favRes.data;
    userRating = ratingRes.data?.score ?? null;
  }

  const { data: rawComments = [] } = await supabase
    .from("comments")
    .select("id, body, parent_id, created_at, author_id, profiles!author_id(username, display_name)")
    .eq("recipe_id", recipe.id)
    .order("created_at", { ascending: true });

  const comments: CommentRow[] = (rawComments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    parent_id: c.parent_id,
    created_at: c.created_at,
    author_id: c.author_id,
    author: c.profiles as unknown as CommentRow["author"],
  }));

  const { data: rawVersions = [] } = await supabase
    .from("recipe_versions")
    .select("id, version_number, change_note, created_at, profiles!created_by(username, display_name)")
    .eq("recipe_id", recipe.id)
    .order("version_number", { ascending: false });

  const versions: VersionRow[] = (rawVersions ?? []).map((v) => ({
    id: v.id,
    version_number: v.version_number,
    change_note: v.change_note,
    created_at: v.created_at,
    is_current: v.id === recipe.current_version_id,
    author: v.profiles as unknown as VersionRow["author"],
  }));

  let forkedFrom: { id: string; title: string; profiles: { username: string; display_name: string | null } | null } | null = null;
  if (recipe.forked_from_recipe_id) {
    const { data } = await supabase
      .from("recipes")
      .select("id, title, profiles!owner_id(username, display_name)")
      .eq("id", recipe.forked_from_recipe_id)
      .maybeSingle();
    if (data) {
      forkedFrom = {
        id: data.id,
        title: data.title,
        profiles: data.profiles as unknown as { username: string; display_name: string | null } | null,
      };
    }
  }

  const t = await getTranslations("recipe");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-zinc-100">{recipe.title}</h1>
          {recipe.description && <p className="text-zinc-400 mt-2">{recipe.description}</p>}
          <p className="text-xs text-zinc-600 mt-2">
            {t("by")} {owner?.display_name ?? owner?.username ?? "—"} · {t("version", { number: version.version_number })}
          </p>
          {forkedFrom && (
            <p className="text-xs text-zinc-500 mt-1">
              {t("forkedFrom")}{" "}
              <Link href={`/r/${forkedFrom.id}`} className="underline hover:text-zinc-300">
                {forkedFrom.title}
              </Link>{" "}
              ({forkedFrom.profiles?.display_name ?? forkedFrom.profiles?.username ?? "—"})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <FavoriteButton
            recipeId={recipe.id}
            userId={user?.id ?? null}
            initialIsFavorited={isFavorited}
            initialCount={recipe.favorites_count ?? 0}
          />
          {isOwner ? (
            <Link
              href={`/r/${recipe.id}/edit`}
              className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition"
            >
              {t("edit")}
            </Link>
          ) : (
            <ForkButton recipeId={recipe.id} userId={user?.id ?? null} />
          )}
        </div>
      </div>

      <RatingStars
        recipeId={recipe.id}
        userId={user?.id ?? null}
        initialUserRating={userRating}
        avg={Number(recipe.ratings_avg ?? 0)}
        count={recipe.ratings_count ?? 0}
      />

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

      <VersionHistory versions={versions} locale={locale} />

      <Comments
        recipeId={recipe.id}
        userId={user?.id ?? null}
        initialComments={comments}
        locale={locale}
      />
    </div>
  );
}
