import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { DonMarcoClient } from "./don-marco-client";

export default async function DonMarcoPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await supabase
    .from("profiles")
    .select("don_marco_accepted_at")
    .eq("id", user!.id)
    .single();

  return <DonMarcoClient locale={locale} hasAccepted={!!profile?.don_marco_accepted_at} />;
}
