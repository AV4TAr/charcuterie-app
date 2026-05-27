"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/actions/update-profile";
import { saveApiKey, deleteApiKey } from "@/app/actions/api-key";

type Props = {
  displayName: string | null;
  bio: string | null;
  username: string;
  email: string;
  hasApiKey: boolean;
};

export function SettingsClient({ displayName, bio, username, email, hasApiKey }: Props) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);
    startTransition(async () => {
      await updateProfile(formData);
      setSaved(true);
    });
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{t("profile")}</div>

          <div style={{ marginBottom: 16 }}>
            <label className="label-lab" htmlFor="username">{t("displayName")}</label>
            <input
              id="display_name"
              name="display_name"
              className="input-lab"
              defaultValue={displayName ?? ""}
              placeholder={username}
              style={{ marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label-lab" htmlFor="bio">{t("bio")}</label>
            <textarea
              id="bio"
              name="bio"
              className="textarea-lab"
              defaultValue={bio ?? ""}
              placeholder={t("bioPlaceholder")}
              rows={3}
              style={{ marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label-lab">Email</label>
            <div
              className="mono"
              style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, padding: "8px 0" }}
            >
              {email}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <button
            type="submit"
            className="btn btn-sm"
            disabled={isPending}
          >
            {isPending ? "..." : t("save")}
          </button>
          {saved && (
            <span className="mono" style={{ fontSize: 12, color: "var(--good)" }}>
              ✓ {t("saved")}
            </span>
          )}
        </div>
      </form>

      <ApiKeySection hasApiKey={hasApiKey} />
    </div>
  );
}

function humanizeError(code: string | undefined, t: (key: string) => string): string {
  if (!code) return "Error";
  if (code === "invalid_format") return t("invalidKey");
  if (code === "encryption_not_configured") return t("errorEncryptionNotConfigured");
  if (code === "table_missing") return t("errorTableMissing");
  if (code === "unauthenticated") return t("errorUnauthenticated");
  return code;
}

function ApiKeySection({ hasApiKey: initialHasKey }: { hasApiKey: boolean }) {
  const t = useTranslations("settings");
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const value = keyInput.trim();
    if (!value.startsWith("sk-ant-")) {
      setError(t("invalidKey"));
      return;
    }
    startSave(async () => {
      try {
        const res = await saveApiKey(value);
        if (!res.ok) {
          setError(humanizeError(res.error, t));
          return;
        }
        setKeyInput("");
        setHasKey(true);
        setSaved(true);
      } catch (e) {
        setError(humanizeError(String(e), t));
      }
    });
  }

  function onDelete() {
    setError(null);
    setSaved(false);
    startDelete(async () => {
      try {
        const res = await deleteApiKey();
        if (!res.ok) {
          setError(humanizeError(res.error, t));
          return;
        }
        setHasKey(false);
      } catch (e) {
        setError(humanizeError(String(e), t));
      }
    });
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{t("ai")}</div>
      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 16 }}>
        {t("aiIntro")}
      </p>

      <div style={{ marginBottom: 16 }}>
        <span
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 999,
            background: hasKey ? "color-mix(in srgb, var(--good) 15%, transparent)" : "var(--bg-2)",
            color: hasKey ? "var(--good)" : "var(--ink-3)",
            border: `1px solid ${hasKey ? "color-mix(in srgb, var(--good) 30%, transparent)" : "var(--rule)"}`,
          }}
        >
          {hasKey ? `✓ ${t("keyConnected")}` : `○ ${t("noKey")}`}
        </span>
      </div>

      <form onSubmit={onSave}>
        <label className="label-lab" htmlFor="api_key">{t("apiKeyLabel")}</label>
        <input
          id="api_key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="input-lab"
          placeholder={t("apiKeyPlaceholder")}
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          style={{ marginTop: 6, marginBottom: 8, fontFamily: "var(--mono)" }}
        />
        <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5, margin: "4px 0 12px" }}>
          {t("apiKeyHint")} {t("getKeyHint")}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="submit"
            className="btn btn-sm"
            disabled={savePending || !keyInput.trim()}
          >
            {savePending ? "..." : t("save")}
          </button>
          {hasKey && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={onDelete}
              disabled={deletePending}
              style={{ color: "var(--warn)" }}
            >
              {deletePending ? t("removing") : t("removeKey")}
            </button>
          )}
          {saved && (
            <span className="mono" style={{ fontSize: 12, color: "var(--good)" }}>
              ✓ {t("saved")}
            </span>
          )}
          {error && (
            <span className="mono" style={{ fontSize: 12, color: "var(--warn)" }}>
              {error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
