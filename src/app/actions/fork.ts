"use server";

import { createClient } from "@/lib/supabase/server";

export async function forkRecipe(recipeId: string): Promise<{ recipeId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: source, error: srcErr } = await supabase
    .from("recipes")
    .select("id, slug, title, description, current_version_id")
    .eq("id", recipeId)
    .single();

  if (srcErr || !source || !source.current_version_id) {
    return { error: srcErr?.message ?? "Recipe not found" };
  }

  const { data: sourceVersion, error: vErr } = await supabase
    .from("recipe_versions")
    .select("id, meat_base_weight_grams, meat_base_display_unit, instructions, cooking_tips")
    .eq("id", source.current_version_id)
    .single();

  if (vErr || !sourceVersion) {
    return { error: vErr?.message ?? "Source version not found" };
  }

  const { data: sourceIngredients, error: iErr } = await supabase
    .from("recipe_version_ingredients")
    .select("ingredient_id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, notes")
    .eq("version_id", source.current_version_id);

  if (iErr) return { error: iErr.message };

  const slug = `${source.slug}-fork-${Math.random().toString(36).slice(2, 6)}`;

  const { data: newRecipe, error: rErr } = await supabase
    .from("recipes")
    .insert({
      owner_id: user.id,
      slug,
      title: source.title,
      description: source.description,
      visibility: "private",
      forked_from_recipe_id: source.id,
      forked_from_version_id: source.current_version_id,
    })
    .select("id")
    .single();

  if (rErr || !newRecipe) return { error: rErr?.message ?? "Failed to create fork" };

  const { data: newVersion, error: nvErr } = await supabase
    .from("recipe_versions")
    .insert({
      recipe_id: newRecipe.id,
      version_number: 1,
      change_note: `Forked from original`,
      instructions: sourceVersion.instructions,
      cooking_tips: sourceVersion.cooking_tips,
      meat_base_weight_grams: sourceVersion.meat_base_weight_grams,
      meat_base_display_unit: sourceVersion.meat_base_display_unit,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (nvErr || !newVersion) return { error: nvErr?.message ?? "Failed to create version" };

  await supabase.from("recipes").update({ current_version_id: newVersion.id }).eq("id", newRecipe.id);

  if (sourceIngredients && sourceIngredients.length > 0) {
    const rows = sourceIngredients.map((row) => ({
      version_id: newVersion.id,
      ingredient_id: row.ingredient_id,
      mode: row.mode,
      percent_of_meat: row.percent_of_meat,
      amount_canonical: row.amount_canonical,
      display_unit: row.display_unit,
      sort_order: row.sort_order,
      notes: row.notes,
    }));
    const { error: insErr } = await supabase.from("recipe_version_ingredients").insert(rows);
    if (insErr) return { error: insErr.message };
  }

  return { recipeId: newRecipe.id };
}
