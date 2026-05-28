"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { getOrCreateShareToken, revokeShareToken } from "@/app/actions/share";

export function ShareButton({
  recipeId,
  isPublic,
  isOwner,
  locale,
}: {
  recipeId: string;
  isPublic: boolean;
  isOwner: boolean;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const isEs = locale !== "en";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function copyLink() {
    let url: string;
    if (isPublic) {
      url = `${window.location.origin}/${locale}/r/${recipeId}`;
    } else {
      const token = await getOrCreateShareToken(recipeId);
      url = `${window.location.origin}/share/${token}`;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRevoke() {
    setOpen(false);
    startTransition(async () => {
      await revokeShareToken(recipeId);
    });
  }

  if (!isOwner && !isPublic) return null;

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => isOwner && !isPublic ? setOpen((v) => !v) : copyLink()}
        disabled={isPending}
        title={isEs ? "Compartir receta" : "Share recipe"}
      >
        {copied
          ? (isEs ? "✓ Link copiado" : "✓ Link copied")
          : (isEs ? "Compartir" : "Share")}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20,
          background: "var(--paper)", border: "1px solid var(--rule)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          minWidth: 180, overflow: "hidden",
        }}>
          <button
            className="btn btn-ghost"
            onClick={copyLink}
            style={{ width: "100%", textAlign: "left", borderRadius: 0, padding: "10px 14px", fontSize: 13 }}
          >
            {isEs ? "Copiar link secreto" : "Copy secret link"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleRevoke}
            style={{ width: "100%", textAlign: "left", borderRadius: 0, padding: "10px 14px", fontSize: 13, color: "var(--warn)" }}
          >
            {isEs ? "Revocar link" : "Revoke link"}
          </button>
        </div>
      )}
    </div>
  );
}
