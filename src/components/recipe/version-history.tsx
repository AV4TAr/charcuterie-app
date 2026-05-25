"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type VersionRow = {
  id: string;
  version_number: number;
  change_note: string | null;
  created_at: string;
  is_current: boolean;
  author: { username: string; display_name: string | null } | null;
};

export function VersionHistory({
  versions,
  locale,
}: {
  versions: VersionRow[];
  locale: string;
}) {
  const t = useTranslations("recipe");
  const [open, setOpen] = useState(false);

  if (versions.length <= 1) return null;

  return (
    <section
      className="rounded"
      style={{ border: "1px solid var(--rule)", overflow: "hidden" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left transition"
        style={{ background: "var(--bg-2)", cursor: "pointer", border: "none" }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
          {t("versions")}{" "}
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>({versions.length})</span>
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
          {open ? t("hideHistory") : t("showHistory")}
        </span>
      </button>
      {open && (
        <ol style={{ borderTop: "1px solid var(--rule)" }}>
          {versions.map((v, i) => {
            const date = new Date(v.created_at).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return (
              <li
                key={v.id}
                className="flex items-start gap-3 p-3"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                  background: v.is_current ? "color-mix(in oklab, var(--accent) 6%, var(--paper))" : "var(--paper)",
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <span
                    className="mono"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "2.5rem",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      background: v.is_current ? "var(--accent)" : "var(--bg-2)",
                      color: v.is_current ? "white" : "var(--ink-2)",
                      border: `1px solid ${v.is_current ? "var(--accent)" : "var(--rule)"}`,
                    }}
                  >
                    v{v.version_number}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, color: "var(--ink)", margin: 0 }}>
                    {v.change_note ?? (v.version_number === 1 ? t("versionInitial") : "—")}
                  </p>
                  <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>
                    {date} · {v.author?.display_name ?? v.author?.username ?? "—"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
