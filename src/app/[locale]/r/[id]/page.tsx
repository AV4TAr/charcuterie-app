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
    .select("id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, notes, scale_with_meat, ingredients(id, name, measurement_type, default_density_g_per_ml)")
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
      percentOfMeat: row.percent_of_meat != null ? Number((Number(row.percent_of_meat) * 100).toFixed(2)) : null,
      amountCanonical: row.amount_canonical != null ? Number(row.amount_canonical) : null,
      displayUnit: row.display_unit as Unit,
      notes: row.notes ?? null,
      sortOrder: row.sort_order,
      scaleWithMeat: row.scale_with_meat ?? true,
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

  let pendingProposalsCount = 0;
  if (isOwner) {
    const { count } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("target_recipe_id", recipe.id)
      .eq("status", "open");
    pendingProposalsCount = count ?? 0;
  }

  const t = await getTranslations("recipe");
  const tProposals = await getTranslations("proposals");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="serif" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1.05, color: "var(--ink)" }}>
            {recipe.title}
          </h1>
          {recipe.description && (
            <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "0 0 8px", lineHeight: 1.45 }}>
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="tag mono">v{version.version_number}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {t("by")} {owner?.display_name ?? owner?.username ?? "—"}
            </span>
            {forkedFrom && (
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                {t("forkedFrom")}{" "}
                <Link
                  href={`/r/${forkedFrom.id}`}
                  style={{ color: "var(--accent-2)", textDecoration: "underline" }}
                >
                  {forkedFrom.title}
                </Link>
              </span>
            )}
            {isOwner && pendingProposalsCount > 0 && (
              <span className="tag tag-accent" style={{ fontSize: 9 }}>
                {pendingProposalsCount === 1
                  ? tProposals("pendingProposals", { count: pendingProposalsCount })
                  : tProposals("pendingProposalsPlural", { count: pendingProposalsCount })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FavoriteButton
            recipeId={recipe.id}
            userId={user?.id ?? null}
            initialIsFavorited={isFavorited}
            initialCount={recipe.favorites_count ?? 0}
          />
          {isOwner ? (
            <Link href={`/r/${recipe.id}/edit`} className="btn btn-sm">
              {t("edit")}
            </Link>
          ) : recipe.forked_from_recipe_id && user ? (
            <Link href={`/proposals/new?from=${recipe.id}`} className="btn btn-sm">
              {tProposals("proposeChanges")}
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
          meatBaseGrams={Number(version.meat_base_weight_grams)}
        />
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{t("noIngredients")}</p>
      )}

      {version.instructions && (
        <div>
          <h2
            className="eyebrow"
            style={{ marginBottom: 12, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}
          >
            {t("instructions")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-2)", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
            {version.instructions}
          </p>
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
