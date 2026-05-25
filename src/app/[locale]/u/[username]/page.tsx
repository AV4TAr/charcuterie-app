import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const [recipesRes, forksRes, starsRes] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, description, visibility, favorites_count, ratings_avg, forked_from_recipe_id, current_version_id, recipe_versions!current_version_id(version_number)")
      .eq("owner_id", profile.id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id")
      .eq("owner_id", profile.id)
      .not("forked_from_recipe_id", "is", null)
      .eq("visibility", "public"),
    supabase
      .from("recipes")
      .select("favorites_count")
      .eq("owner_id", profile.id)
      .eq("visibility", "public"),
  ]);

  const publicRecipes = recipesRes.data ?? [];
  const forkCount = forksRes.data?.length ?? 0;
  const totalStars = (starsRes.data ?? []).reduce((s, r) => s + (r.favorites_count ?? 0), 0);

  const t = await getTranslations("profile");

  const initials = (profile.display_name ?? profile.username)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "40px 0 24px",
          display: "flex",
          gap: 32,
          alignItems: "flex-end",
          borderBottom: "1px solid var(--rule)",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "var(--accent-2)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--serif)",
            fontSize: 40,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="serif" style={{ fontSize: 40, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {profile.display_name ?? profile.username}
          </h1>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            @{profile.username}
          </div>
          {profile.bio && (
            <p style={{ fontSize: 14, color: "var(--ink-2)", maxWidth: 500, marginTop: 10, lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
          {[
            { k: publicRecipes.length, l: t("recipes") },
            { k: forkCount, l: t("forks") },
            { k: totalStars, l: t("stars") },
          ].map((s) => (
            <div key={s.l}>
              <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: "var(--ink)" }}>{s.k}</div>
              <div className="eyebrow" style={{ marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipes grid */}
      {publicRecipes.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("noRecipes")}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {publicRecipes.map((r) => {
            const vd = r.recipe_versions as unknown as { version_number: number } | null;
            return (
              <Link
                key={r.id}
                href={`/r/${r.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card"
                  style={{
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "start",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{r.title}</span>
                      <span className="tag mono" style={{ fontSize: 9 }}>v{vd?.version_number ?? 1}</span>
                    </div>
                    {r.description && (
                      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {r.description}
                      </p>
                    )}
                    <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8 }}>
                      ★ {r.favorites_count ?? 0}
                      {r.forked_from_recipe_id && " · fork"}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
