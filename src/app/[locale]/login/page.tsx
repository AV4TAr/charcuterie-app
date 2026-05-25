import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("auth");

  return (
    <div style={{ maxWidth: 440, margin: "60px auto 0" }}>
      <div className="card p-8">
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px", color: "var(--ink)" }}>
            {t("signIn")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0 }}>{t("magicLinkSubtitle")}</p>
        </div>
        {error === "callback" && (
          <p style={{ fontSize: 13, color: "var(--warn)", marginBottom: 16 }}>{t("callbackError")}</p>
        )}
        <LoginForm locale={locale} />
      </div>
    </div>
  );
}
