import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const t = await getTranslations("settings");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="serif" style={{ fontSize: 32, margin: 0, color: "var(--ink)" }}>{t("title")}</h1>
      <SettingsClient
        displayName={profile?.display_name ?? null}
        bio={profile?.bio ?? null}
        username={profile?.username ?? ""}
        email={user!.email ?? ""}
        hasApiKey={!!keyRow}
      />
    </div>
  );
}
