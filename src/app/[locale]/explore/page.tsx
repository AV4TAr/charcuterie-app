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
    .eq("visibility", "public")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="serif" style={{ fontSize: 32, margin: 0, color: "var(--ink)" }}>
          {t("explore")}
        </h1>
        <Link href="/new" className="btn btn-primary btn-sm">
          + {t("newRecipe")}
        </Link>
      </div>

      {!recipes || recipes.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--ink-3)" }}>
          <p style={{ fontSize: 18, marginBottom: 6 }}>{tExp("empty")}</p>
          <p style={{ fontSize: 13, marginBottom: 24 }}>{tExp("emptyHint")}</p>
          <Link href="/new" className="btn btn-primary">
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
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  className="card p-4 h-full flex flex-col transition"
                  style={{ cursor: "pointer" }}
                >
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
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                      {tRec("by")} {owner?.display_name ?? owner?.username ?? "—"}
                    </p>
                    <div className="flex items-center gap-2">
                      {fav > 0 && <span className="tag">★ {fav}</span>}
                      {avg > 0 && <span className="tag mono">{avg.toFixed(1)}/5</span>}
                    </div>
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
