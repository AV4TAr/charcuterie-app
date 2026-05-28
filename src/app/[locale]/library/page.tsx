import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { LibraryClient } from "./library-client";

type FavoriteRow = {
  recipes: {
    id: string;
    title: string;
    description: string | null;
    favorites_count: number;
    ratings_avg: number | null;
    profiles: { username: string | null } | null;
  } | null;
};

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: rawRecipes = [] } = await supabase
    .from("recipes")
    .select(`
      id, title, description, visibility, favorites_count, ratings_avg,
      forked_from_recipe_id, current_version_id,
      recipe_versions!current_version_id(version_number)
    `)
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });

  const recipes = (rawRecipes ?? []).map((r) => {
    const versionData = r.recipe_versions as unknown as { version_number: number } | null;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      visibility: r.visibility,
      favorites_count: r.favorites_count ?? 0,
      ratings_avg: r.ratings_avg,
      current_version_id: r.current_version_id,
      version_number: versionData?.version_number ?? null,
      forked_from_recipe_id: r.forked_from_recipe_id,
    };
  });

  const { data: favRows = [] } = await supabase
    .from("favorites")
    .select("recipes(id, title, description, favorites_count, ratings_avg, profiles!owner_id(username))")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const favorites = ((favRows ?? []) as unknown as FavoriteRow[])
    .map((f) => f.recipes)
    .filter(Boolean)
    .map((r) => ({
      id: r!.id,
      title: r!.title,
      description: r!.description,
      favorites_count: r!.favorites_count ?? 0,
      ratings_avg: r!.ratings_avg,
      owner_username: (r!.profiles as unknown as { username: string | null } | null)?.username ?? null,
    }));

  const totalStars = recipes.reduce((sum, r) => sum + r.favorites_count, 0);

  const t = await getTranslations("library");
  const tNav = await getTranslations("nav");
  const tRec = await getTranslations("recipe");

  const displayName = profile?.display_name ?? profile?.username ?? user!.email?.split("@")[0] ?? "—";

  const tStrings: Record<string, string> = {
    tabAll: t("tabAll"),
    tabPublic: t("tabPublic"),
    tabPrivate: t("tabPrivate"),
    tabFavorites: t("tabFavorites"),
    noRecipes: t("noRecipes"),
    noRecipesHint: t("noRecipesHint"),
    noPublic: t("noPublic"),
    noPrivate: t("noPrivate"),
    noFavorites: t("noFavorites"),
    noFavoritesHint: t("noFavoritesHint"),
    createFirst: t("createFirst"),
    browsePublic: t("browsePublic"),
    statsRecipes: t("statsRecipes"),
    statsStars: t("statsStars"),
    public: tRec("public"),
    private: tRec("private"),
    edit: tRec("edit"),
    confirm: t("confirm"),
    cancel: t("cancel"),
    confirmMakePublic: t("confirmMakePublic"),
    confirmMakePrivate: t("confirmMakePrivate"),
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-wrap items-end justify-between gap-4 mb-8 pb-8"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>{t("title")}</p>
          <h1
            className="serif"
            style={{ fontSize: 48, margin: "0 0 6px", lineHeight: 0.95, color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            {displayName}
          </h1>
          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            {[
              { k: String(recipes.length), l: t("statsRecipes") },
              { k: String(totalStars), l: t("statsStars") },
              { k: String(favorites.length), l: t("tabFavorites").toLowerCase() },
            ].map((s) => (
              <div key={s.l} style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 12 }}>
                <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: "var(--accent-2)" }}>{s.k}</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <Link href="/new" className="btn btn-primary">
          + {tNav("newRecipe")}
        </Link>
      </div>

      <LibraryClient
        recipes={recipes}
        favorites={favorites}
        t={tStrings}
        totalStars={totalStars}
      />
    </div>
  );
}
