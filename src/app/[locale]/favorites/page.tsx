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
      <h1 className="serif" style={{ fontSize: 32, margin: "0 0 32px", color: "var(--ink)" }}>
        {tFav("title")}
      </h1>

      {favorites.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--ink-3)" }}>
          <p style={{ fontSize: 18, marginBottom: 6 }}>{tFav("empty")}</p>
          <p style={{ fontSize: 13, marginBottom: 24 }}>{tFav("emptyHint")}</p>
          <Link href="/explore" className="btn btn-primary">
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
                style={{ textDecoration: "none", display: "block" }}
              >
                <div className="card p-4 h-full flex flex-col transition" style={{ cursor: "pointer" }}>
                  <h2
                    className="serif"
                    style={{ fontSize: 20, margin: "0 0 6px", color: "var(--ink)", lineHeight: 1.2 }}
                  >
                    {r.title}
                  </h2>
                  {r.description && (
                    <p
                      className="line-clamp-2"
                      style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, margin: "0 0 12px" }}
                    >
                      {r.description}
                    </p>
                  )}
                  <p className="mono mt-auto" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                    {tRec("by")} {r.profiles?.display_name ?? r.profiles?.username ?? "—"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
