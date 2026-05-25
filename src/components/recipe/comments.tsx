"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export type CommentRow = {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author_id: string;
  author: { username: string; display_name: string | null } | null;
};

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffSec = (Date.now() - date.getTime()) / 1000;
  if (diffSec < 60) return locale === "es" ? "hace instantes" : "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return locale === "es" ? `hace ${m} min` : `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return locale === "es" ? `hace ${h} h` : `${h}h ago`;
  }
  return date.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export function Comments({
  recipeId,
  userId,
  initialComments,
  locale,
}: {
  recipeId: string;
  userId: string | null;
  initialComments: CommentRow[];
  locale: string;
}) {
  const t = useTranslations("recipe");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const topLevel = initialComments.filter((c) => !c.parent_id);
  const repliesOf = (parentId: string) =>
    initialComments.filter((c) => c.parent_id === parentId);

  function authorLabel(c: CommentRow) {
    return c.author?.display_name ?? c.author?.username ?? "—";
  }

  async function post(text: string, parentId: string | null) {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!text.trim()) return;
    setError("");

    const supabase = createClient();
    const { error: insertErr } = await supabase.from("comments").insert({
      recipe_id: recipeId,
      author_id: userId,
      parent_id: parentId,
      body: text.trim(),
    });

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    if (parentId) {
      setReplyBody("");
      setReplyTo(null);
    } else {
      setBody("");
    }
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(() => post(body, null));
  }

  function onReply(e: FormEvent, parentId: string) {
    e.preventDefault();
    startTransition(() => post(replyBody, parentId));
  }

  return (
    <section className="space-y-4">
      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--rule)" }}>
        {t("comments")}{" "}
        {initialComments.length > 0 && (
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 400 }}>
            ({initialComments.length})
          </span>
        )}
      </h2>

      {userId ? (
        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={3}
            className="textarea-lab"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="btn btn-primary btn-sm"
            >
              {pending ? t("posting") : t("postComment")}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{t("signInToComment")}</p>
      )}

      {error && <p style={{ fontSize: 13, color: "var(--warn)" }}>{error}</p>}

      {topLevel.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>{t("noComments")}</p>
      ) : (
        <ul className="space-y-3">
          {topLevel.map((c) => {
            const replies = repliesOf(c.id);
            return (
              <li
                key={c.id}
                className="rounded p-3 space-y-2"
                style={{ border: "1px solid var(--rule)", background: "var(--paper)" }}
              >
                <div className="flex items-baseline gap-2">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{authorLabel(c)}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{formatWhen(c.created_at, locale)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-wrap", margin: 0 }}>{c.body}</p>
                {userId && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "2px 6px", fontSize: 11 }}
                  >
                    {t("reply")}
                  </button>
                )}

                {replyTo === c.id && (
                  <form
                    onSubmit={(e) => onReply(e, c.id)}
                    className="space-y-2 pl-3"
                    style={{ borderLeft: "2px solid var(--rule)" }}
                  >
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("replyPlaceholder")}
                      rows={2}
                      autoFocus
                      className="textarea-lab"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={pending || !replyBody.trim()}
                        className="btn btn-primary btn-sm"
                      >
                        {pending ? t("posting") : t("postComment")}
                      </button>
                    </div>
                  </form>
                )}

                {replies.length > 0 && (
                  <ul
                    className="space-y-2 pl-4 mt-2"
                    style={{ borderLeft: "2px solid var(--rule-soft)" }}
                  >
                    {replies.map((r) => (
                      <li key={r.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{authorLabel(r)}</span>
                          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{formatWhen(r.created_at, locale)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-wrap", margin: 0 }}>{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
