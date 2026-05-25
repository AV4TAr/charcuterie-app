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
    <section className="border border-zinc-800 rounded-md bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left text-sm text-zinc-300 hover:text-zinc-100 transition"
        aria-expanded={open}
      >
        <span className="font-medium">
          {t("versions")} <span className="text-zinc-500 font-normal">({versions.length})</span>
        </span>
        <span className="text-xs text-zinc-500">{open ? t("hideHistory") : t("showHistory")}</span>
      </button>
      {open && (
        <ol className="border-t border-zinc-800 divide-y divide-zinc-800">
          {versions.map((v) => {
            const date = new Date(v.created_at).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return (
              <li key={v.id} className="p-3 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded text-xs font-mono ${
                    v.is_current ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                  }`}>
                    v{v.version_number}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">
                    {v.change_note ?? (v.version_number === 1 ? t("versionInitial") : "—")}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
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
