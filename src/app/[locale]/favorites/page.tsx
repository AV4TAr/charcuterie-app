import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

type FavoriteRow = {
  recipe_id: string;
  created_at: string;
  recipes: {
    id: string;
    title: string;
    description: string | null;
    favorites_count: number;
    ratings_avg: number;
    profiles: { username: string; display_name: string | null } | null;
  } | null;
};

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: rows = [] } = await supabase
    .from("favorites")
    .select("recipe_id, created_at, recipes(id, title, description, favorites_count, ratings_avg, profiles!owner_id(username, display_name))")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const favorites = (rows ?? []) as unknown as FavoriteRow[];
  const tFav = await getTranslations("favorites");
  const tRec = await getTranslations("recipe");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">{tFav("title")}</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-lg mb-1">{tFav("empty")}</p>
          <p className="text-sm mb-6">{tFav("emptyHint")}</p>
          <Link
            href="/explore"
            className="text-sm px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-medium transition"
          >
            {tFav("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => {
            const r = f.recipes;
            if (!r) return null;
            return (
              <Link
                key={f.recipe_id}
                href={`/r/${r.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition group"
              >
                <h2 className="font-semibold text-zinc-100 group-hover:text-amber-300 transition mb-1">
                  {r.title}
                </h2>
                {r.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{r.description}</p>
                )}
                <p className="text-xs text-zinc-600">
                  {tRec("by")} {r.profiles?.display_name ?? r.profiles?.username ?? "—"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
