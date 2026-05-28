"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createProposal } from "@/app/actions/proposals";

type Props = {
  sourceRecipeId: string;
  sourceVersionId: string;
  targetRecipeId: string;
  locale: string;
};

export function NewProposalForm({ sourceRecipeId, sourceVersionId, targetRecipeId, locale }: Props) {
  const t = useTranslations("proposals");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string).trim();
    const description = (fd.get("description") as string).trim();
    if (!title) return;

    setError(null);
    startTransition(async () => {
      const result = await createProposal({ sourceRecipeId, sourceVersionId, targetRecipeId, title, description });
      if (result.error) {
        setError(result.error);
      } else if (result.proposalId) {
        router.push(`/${locale}/proposals/${result.proposalId}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label className="label-lab">{t("proposalTitle")}</label>
        <input
          name="title"
          className="input-lab"
          placeholder={t("proposalTitlePlaceholder")}
          required
          style={{ marginTop: 6 }}
        />
      </div>
      <div>
        <label className="label-lab">{t("description")}</label>
        <textarea
          name="description"
          className="textarea-lab"
          placeholder={t("descriptionPlaceholder")}
          rows={4}
          style={{ marginTop: 6 }}
        />
      </div>
      {error && (
        <p style={{ fontSize: 13, color: "var(--warn)", margin: 0 }}>{error}</p>
      )}
      <div>
        <button type="submit" className="btn btn-sm" disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
