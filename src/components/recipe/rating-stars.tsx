"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function RatingStars({
  recipeId,
  userId,
  initialUserRating,
  avg,
  count,
}: {
  recipeId: string;
  userId: string | null;
  initialUserRating: number | null;
  avg: number;
  count: number;
}) {
  const t = useTranslations("recipe");
  const router = useRouter();
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [hover, setHover] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function setRating(score: number) {
    if (!userId) {
      router.push("/login");
      return;
    }
    const previous = userRating;
    setUserRating(score);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("ratings")
        .upsert(
          { user_id: userId, recipe_id: recipeId, score },
          { onConflict: "user_id,recipe_id" },
        );
      if (error) {
        setUserRating(previous);
      } else {
        router.refresh();
      }
    });
  }

  const display = hover ?? userRating ?? Math.round(avg);
  const showsUser = userRating != null;
  const countLabel = count === 1 ? t("ratingsCount", { count }) : t("ratingsCountPlural", { count });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`Rate ${n}`}
              style={{
                fontSize: 18,
                lineHeight: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 1px",
                color: n <= display ? "var(--accent)" : "var(--rule)",
                transition: "color 80ms",
              }}
            >
              ★
            </button>
          ))}
        </div>
        {count > 0 ? (
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {avg.toFixed(1)} · {countLabel}
          </span>
        ) : (
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("notRatedYet")}</span>
        )}
      </div>
      {!userId && (
        <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{t("signInToRate")}</p>
      )}
      {showsUser && (
        <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{t("yourRating")}: {userRating}/5</p>
      )}
    </div>
  );
}
