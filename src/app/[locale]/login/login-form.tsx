"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/${locale}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
        {t("checkEmail", { email })}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-lab" htmlFor="email">{t("email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="input-lab"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary w-full"
        style={{ justifyContent: "center" }}
      >
        {status === "sending" ? t("sending") : t("sendMagicLink")}
      </button>
      {status === "error" && (
        <p style={{ fontSize: 13, color: "var(--warn)" }}>{errorMsg || t("errorOccurred")}</p>
      )}
    </form>
  );
}
