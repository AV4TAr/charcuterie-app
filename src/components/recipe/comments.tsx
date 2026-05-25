"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
      <h2 className="text-lg font-semibold text-zinc-200">
        {t("comments")} {initialComments.length > 0 && <span className="text-zinc-500 text-sm font-normal">({initialComments.length})</span>}
      </h2>

      {userId ? (
        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !body.trim()} size="sm">
              {pending ? t("posting") : t("postComment")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">{t("signInToComment")}</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {topLevel.length === 0 ? (
        <p className="text-sm text-zinc-600 italic">{t("noComments")}</p>
      ) : (
        <ul className="space-y-4">
          {topLevel.map((c) => {
            const replies = repliesOf(c.id);
            return (
              <li key={c.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-zinc-200">{authorLabel(c)}</span>
                  <span className="text-zinc-600">{formatWhen(c.created_at, locale)}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{c.body}</p>
                {userId && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {t("reply")}
                  </button>
                )}

                {replyTo === c.id && (
                  <form onSubmit={(e) => onReply(e, c.id)} className="space-y-2 pl-3 border-l-2 border-zinc-800">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("replyPlaceholder")}
                      rows={2}
                      autoFocus
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={pending || !replyBody.trim()} size="sm">
                        {pending ? t("posting") : t("postComment")}
                      </Button>
                    </div>
                  </form>
                )}

                {replies.length > 0 && (
                  <ul className="space-y-2 pl-4 mt-2 border-l-2 border-zinc-800">
                    {replies.map((r) => (
                      <li key={r.id} className="space-y-1">
                        <div className="flex items-baseline gap-2 text-xs">
                          <span className="font-medium text-zinc-200">{authorLabel(r)}</span>
                          <span className="text-zinc-600">{formatWhen(r.created_at, locale)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.body}</p>
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
