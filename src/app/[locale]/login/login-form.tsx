"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <p className="text-sm text-zinc-200">
        {t("checkEmail", { email })}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? t("sending") : t("sendMagicLink")}
      </Button>
      {status === "error" && (
        <p className="text-sm text-red-400">{errorMsg || t("errorOccurred")}</p>
      )}
    </form>
  );
}
