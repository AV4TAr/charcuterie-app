"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function FavoriteButton({
  recipeId,
  userId,
  initialIsFavorited,
  initialCount,
}: {
  recipeId: string;
  userId: string | null;
  initialIsFavorited: boolean;
  initialCount: number;
}) {
  const t = useTranslations("recipe");
  const router = useRouter();
  const [isFav, setIsFav] = useState(initialIsFavorited);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (!userId) {
      router.push("/login");
      return;
    }
    const nextIsFav = !isFav;
    setIsFav(nextIsFav);
    setCount((c) => c + (nextIsFav ? 1 : -1));

    startTransition(async () => {
      const supabase = createClient();
      if (nextIsFav) {
        const { error } = await supabase.from("favorites").insert({ user_id: userId, recipe_id: recipeId });
        if (error) {
          setIsFav(false);
          setCount((c) => c - 1);
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", recipeId);
        if (error) {
          setIsFav(true);
          setCount((c) => c + 1);
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFav}
      aria-label={isFav ? t("unfavorite") : t("favorite")}
      className="btn btn-sm"
      style={isFav ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{isFav ? "★" : "☆"}</span>
      <span className="mono" style={{ fontSize: 11 }}>{count}</span>
    </button>
  );
}
