import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { NewProposalForm } from "./new-proposal-form";

export default async function NewProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  const { from: sourceRecipeId } = await searchParams;
  setRequestLocale(locale);

  if (!sourceRecipeId) redirect(`/${locale}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: sourceRecipe } = await supabase
    .from("recipes")
    .select("id, title, owner_id, forked_from_recipe_id, current_version_id")
    .eq("id", sourceRecipeId)
    .maybeSingle();

  if (!sourceRecipe || sourceRecipe.owner_id !== user.id) notFound();
  if (!sourceRecipe.forked_from_recipe_id || !sourceRecipe.current_version_id) {
    redirect(`/${locale}/r/${sourceRecipeId}`);
  }

  const { data: targetRecipe } = await supabase
    .from("recipes")
    .select("id, title, profiles!owner_id(username, display_name)")
    .eq("id", sourceRecipe.forked_from_recipe_id)
    .maybeSingle();

  if (!targetRecipe) notFound();

  const t = await getTranslations("proposals");
  const targetOwner = targetRecipe.profiles as unknown as { username: string; display_name: string | null } | null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <span className="eyebrow">{t("new")}</span>
        <h1 className="serif" style={{ fontSize: 32, margin: "8px 0 0", color: "var(--ink)" }}>
          {sourceRecipe.title}
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
          {t("into")} @{targetOwner?.username ?? "?"} / {targetRecipe.title}
        </p>
      </div>
      <NewProposalForm
        sourceRecipeId={sourceRecipe.id}
        sourceVersionId={sourceRecipe.current_version_id!}
        targetRecipeId={targetRecipe.id}
        locale={locale}
      />
    </div>
  );
}
