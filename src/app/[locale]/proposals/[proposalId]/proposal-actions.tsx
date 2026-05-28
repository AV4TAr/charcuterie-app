"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { acceptProposal, rejectProposal, addProposalComment } from "@/app/actions/proposals";

export function ProposalActions({
  proposalId,
  targetVersionNumber,
  isTargetOwner,
}: {
  proposalId: string;
  targetVersionNumber: number;
  isTargetOwner: boolean;
}) {
  const t = useTranslations("proposals");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptProposal(proposalId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectProposal(proposalId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const result = await addProposalComment(proposalId, comment);
    setPosting(false);
    if (!result.error) {
      setComment("");
      router.refresh();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form onSubmit={handleComment}>
        <textarea
          className="textarea-lab"
          placeholder={t("commentPlaceholder")}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" className="btn btn-sm" disabled={posting || !comment.trim()}>
            {posting ? t("posting") : t("comment")}
          </button>
          {isTargetOwner && (
            <>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleReject}
                disabled={isPending}
                style={{ borderColor: "var(--warn)", color: "var(--warn)" }}
              >
                ✕ {t("reject")}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleAccept}
                disabled={isPending}
                style={{ background: "var(--good)", borderColor: "var(--good)", color: "white" }}
              >
                ✓ {t("accept")} → v{targetVersionNumber + 1}
              </button>
            </>
          )}
        </div>
        {error && <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 8 }}>{error}</p>}
      </form>
    </div>
  );
}
