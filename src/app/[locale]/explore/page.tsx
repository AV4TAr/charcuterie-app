import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("nav");
  const tExp = await getTranslations("explore");
  const tRec = await getTranslations("recipe");

  const supabase = await createClient();
  const { data: recipes = [] } = await supabase
    .from("recipes")
    .select(
      "id, title, description, visibility, favorites_count, ratings_avg, created_at, profiles!owner_id(username, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t("explore")}</h1>
        <Link
          href="/new"
          className="text-sm px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-medium transition"
        >
          {t("newRecipe")}
        </Link>
      </div>

      {!recipes || recipes.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-lg mb-1">{tExp("empty")}</p>
          <p className="text-sm mb-6">{tExp("emptyHint")}</p>
          <Link
            href="/new"
            className="text-sm px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-medium transition"
          >
            {tExp("createFirst")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => {
            const owner = r.profiles as unknown as { username: string; display_name: string | null } | null;
            const fav = r.favorites_count ?? 0;
            const avg = Number(r.ratings_avg ?? 0);
            return (
              <Link
                key={r.id}
                href={`/r/${r.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition group"
              >
                <h2 className="font-semibold text-zinc-100 group-hover:text-amber-300 transition mb-1">
                  {r.title}
                </h2>
                {r.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{r.description}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-xs text-zinc-600">
                    {tRec("by")} {owner?.display_name ?? owner?.username ?? "—"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {fav > 0 && <span title="favorites">★ {fav}</span>}
                    {avg > 0 && <span title="rating">{avg.toFixed(1)}/5</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
