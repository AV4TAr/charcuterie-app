"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/actions/update-profile";

type Props = {
  displayName: string | null;
  bio: string | null;
  username: string;
  email: string;
};

export function SettingsClient({ displayName, bio, username, email }: Props) {
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
  );
}
