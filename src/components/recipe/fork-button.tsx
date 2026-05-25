"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { useRouter as useNextRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { forkRecipe } from "@/app/actions/fork";

export function ForkButton({
  recipeId,
  userId,
}: {
  recipeId: string;
  userId: string | null;
}) {
  const t = useTranslations("recipe");
  const router = useRouter();
  const nextRouter = useNextRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    if (!userId) {
      nextRouter.push("/login");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await forkRecipe(recipeId);
      if (result.error || !result.recipeId) {
        setError(result.error ?? "Fork failed");
        return;
      }
      router.push(`/r/${result.recipeId}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition disabled:opacity-50"
      >
        {pending ? t("forking") : t("fork")}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
