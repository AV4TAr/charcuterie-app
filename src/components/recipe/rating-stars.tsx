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
    <div className="space-y-1">
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
              className={`text-lg leading-none transition ${
                n <= display ? "text-amber-400" : "text-zinc-700"
              } hover:text-amber-300`}
            >
              ★
            </button>
          ))}
        </div>
        {count > 0 ? (
          <span className="text-xs text-zinc-500">
            {avg.toFixed(1)} · {countLabel}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">{t("notRatedYet")}</span>
        )}
      </div>
      {!userId && (
        <p className="text-xs text-zinc-600">{t("signInToRate")}</p>
      )}
      {showsUser && (
        <p className="text-xs text-zinc-500">{t("yourRating")}: {userRating}/5</p>
      )}
    </div>
  );
}
