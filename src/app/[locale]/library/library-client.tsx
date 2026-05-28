"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Link } from "@/lib/i18n/routing";
import { setRecipeVisibility } from "@/app/actions/recipe-visibility";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  favorites_count: number;
  ratings_avg: number | null;
  current_version_id: string | null;
  version_number: number | null;
  forked_from_recipe_id: string | null;
};

type FavoriteRecipe = {
  id: string;
  title: string;
  description: string | null;
  favorites_count: number;
  ratings_avg: number | null;
  owner_username: string | null;
};

type Tab = "all" | "public" | "private" | "favorites";

export function LibraryClient({
  recipes,
  favorites,
  t,
  totalStars,
}: {
  recipes: Recipe[];
  favorites: FavoriteRecipe[];
  t: Record<string, string>;
  totalStars: number;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered =
    tab === "public"
      ? recipes.filter((r) => r.visibility === "public")
      : tab === "private"
      ? recipes.filter((r) => r.visibility === "private")
      : recipes;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t.tabAll, count: recipes.length },
    { key: "public", label: t.tabPublic, count: recipes.filter((r) => r.visibility === "public").length },
    { key: "private", label: t.tabPrivate, count: recipes.filter((r) => r.visibility === "private").length },
    { key: "favorites", label: t.tabFavorites, count: favorites.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-6"
        style={{ borderBottom: "1px solid var(--rule)", marginBottom: 24 }}
      >
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className="mono"
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === tb.key ? "2px solid var(--ink)" : "2px solid transparent",
              marginBottom: -1,
              padding: "10px 0",
              cursor: "pointer",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: tab === tb.key ? "var(--ink)" : "var(--ink-3)",
              transition: "color 120ms",
            }}
          >
            {tb.label}{" "}
            <span style={{ opacity: 0.6 }}>{tb.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "favorites" ? (
        <FavoritesGrid favorites={favorites} t={t} />
      ) : (
        <RecipesGrid recipes={filtered} tab={tab} t={t} />
      )}
    </div>
  );
}

function RecipesGrid({
  recipes,
  tab,
  t,
}: {
  recipes: Recipe[];
  tab: Tab;
  t: Record<string, string>;
}) {
  if (recipes.length === 0) {
    const emptyMsg =
      tab === "public" ? t.noPublic : tab === "private" ? t.noPrivate : t.noRecipes;
    const hint = tab === "all" ? t.noRecipesHint : undefined;
    return (
      <div className="text-center py-24" style={{ color: "var(--ink-3)" }}>
        <p style={{ fontSize: 18, marginBottom: 6 }}>{emptyMsg}</p>
        {hint && <p style={{ fontSize: 13, marginBottom: 24 }}>{hint}</p>}
        <Link href="/new" className="btn btn-primary">
          {t.createFirst}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} t={t} />
      ))}
    </div>
  );
}

function RecipeCard({ recipe: initial, t }: { recipe: Recipe; t: Record<string, string> }) {
  const [r, setR] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);
  const avg = Number(r.ratings_avg ?? 0);
  const isPublic = r.visibility === "public";
  const isForked = !!r.forked_from_recipe_id;
  const nextVisibility = isPublic ? "private" : "public";

  useEffect(() => {
    if (!confirming) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [confirming]);

  function handleConfirm() {
    startTransition(async () => {
      await setRecipeVisibility(r.id, nextVisibility);
      setR((prev) => ({ ...prev, visibility: nextVisibility }));
      setConfirming(false);
    });
  }

  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      <Link
        href={`/r/${r.id}`}
        style={{ textDecoration: "none", display: "block", padding: 16, flex: 1 }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2
            className="serif"
            style={{ fontSize: 20, margin: 0, color: "var(--ink)", lineHeight: 1.15 }}
          >
            {r.title}
          </h2>
          <div className="flex items-center gap-1.5 flex-shrink-0" style={{ position: "relative" }}>
            {r.version_number != null && (
              <span className="tag mono" style={{ fontSize: 9 }}>v{r.version_number}</span>
            )}
            {/* Clickable visibility badge */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming((v) => !v); }}
              disabled={isPending}
              className="tag"
              style={{
                fontSize: 9, cursor: "pointer", border: "none",
                ...(isPublic ? {
                  background: "color-mix(in oklab, var(--good) 12%, var(--paper))",
                  borderColor: "color-mix(in oklab, var(--good) 30%, var(--rule))",
                  color: "var(--good)",
                } : {}),
              }}
            >
              {isPending ? "…" : isPublic ? t.public : t.private}
            </button>

            {/* Inline confirmation popover */}
            {confirming && (
              <div
                ref={popoverRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
                  background: "var(--paper)", border: "1px solid var(--rule)",
                  borderRadius: 8, padding: "10px 12px", minWidth: 180,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  whiteSpace: "nowrap",
                }}
              >
                <p style={{ fontSize: 12, color: "var(--ink-2)", margin: "0 0 8px", lineHeight: 1.4 }}>
                  {nextVisibility === "public" ? t.confirmMakePublic : t.confirmMakePrivate}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: 11, flex: 1, justifyContent: "center" }}
                  >
                    {t.confirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: 11 }}
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {isForked && (
          <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", margin: "0 0 6px" }}>
            fork
          </p>
        )}
        {r.description && (
          <p
            className="line-clamp-2"
            style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, margin: "0 0 12px" }}
          >
            {r.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-auto">
          {r.favorites_count > 0 && (
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              ★ {r.favorites_count}
            </span>
          )}
          {avg > 0 && (
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {avg.toFixed(1)}/5
            </span>
          )}
        </div>
      </Link>
      <div
        style={{
          borderTop: "1px solid var(--rule)",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Link
          href={`/r/${r.id}/edit`}
          className="btn btn-ghost btn-sm mono"
          style={{ fontSize: 11 }}
        >
          {t.edit} →
        </Link>
      </div>
    </div>
  );
}

function FavoritesGrid({
  favorites,
  t,
}: {
  favorites: FavoriteRecipe[];
  t: Record<string, string>;
}) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-24" style={{ color: "var(--ink-3)" }}>
        <p style={{ fontSize: 18, marginBottom: 6 }}>{t.noFavorites}</p>
        <p style={{ fontSize: 13, marginBottom: 24 }}>{t.noFavoritesHint}</p>
        <Link href="/explore" className="btn btn-primary">
          {t.browsePublic}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((r) => (
        <Link
          key={r.id}
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
              {r.owner_username ? `@${r.owner_username}` : "—"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
