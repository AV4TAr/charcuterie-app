import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { NewRecipeChooser } from "./new-recipe-chooser";

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/login", locale });

  const [{ data: ingredients = [] }, { data: profile }] = await Promise.all([
    supabase.from("ingredients")
      .select("id, name, name_es, name_en, measurement_type, default_density_g_per_ml, category")
      .order("category").order("name"),
    supabase.from("profiles").select("don_marco_accepted_at").eq("id", user!.id).single(),
  ]);

  return (
    <NewRecipeChooser
      locale={locale}
      ingredients={ingredients ?? []}
      userId={user!.id}
      hasAcceptedDisclaimer={!!profile?.don_marco_accepted_at}
    />
  );
}
