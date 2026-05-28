"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProposal(data: {
  sourceRecipeId: string;
  sourceVersionId: string;
  targetRecipeId: string;
  title: string;
  description: string;
}): Promise<{ proposalId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      source_recipe_id: data.sourceRecipeId,
      source_version_id: data.sourceVersionId,
      target_recipe_id: data.targetRecipeId,
      title: data.title,
      description: data.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !proposal) return { error: error?.message ?? "Failed to create proposal" };

  revalidatePath(`/r/${data.targetRecipeId}`);
  return { proposalId: proposal.id };
}

export async function acceptProposal(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, source_version_id, target_recipe_id, status")
    .eq("id", proposalId)
    .single();

  if (pErr || !proposal) return { error: "Proposal not found" };
  if (proposal.status !== "open") return { error: "Proposal is not open" };

  const { data: targetRecipe, error: rErr } = await supabase
    .from("recipes")
    .select("id, owner_id, current_version_id")
    .eq("id", proposal.target_recipe_id)
    .single();

  if (rErr || !targetRecipe) return { error: "Target recipe not found" };
  if (targetRecipe.owner_id !== user.id) return { error: "Not authorized" };

  const { data: sourceVersion, error: svErr } = await supabase
    .from("recipe_versions")
    .select("meat_base_weight_grams, meat_base_display_unit, instructions, cooking_tips")
    .eq("id", proposal.source_version_id)
    .single();

  if (svErr || !sourceVersion) return { error: "Source version not found" };

  const { data: sourceIngredients, error: siErr } = await supabase
    .from("recipe_version_ingredients")
    .select("ingredient_id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, notes")
    .eq("version_id", proposal.source_version_id);

  if (siErr) return { error: siErr.message };

  const { data: latestVersion } = await supabase
    .from("recipe_versions")
    .select("version_number")
    .eq("recipe_id", proposal.target_recipe_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;

  const { data: newVersion, error: nvErr } = await supabase
    .from("recipe_versions")
    .insert({
      recipe_id: proposal.target_recipe_id,
      version_number: nextVersionNumber,
      change_note: `Accepted proposal: ${proposal.id.slice(0, 8)}`,
      instructions: sourceVersion.instructions,
      cooking_tips: sourceVersion.cooking_tips,
      meat_base_weight_grams: sourceVersion.meat_base_weight_grams,
      meat_base_display_unit: sourceVersion.meat_base_display_unit,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (nvErr || !newVersion) return { error: nvErr?.message ?? "Failed to create version" };

  await supabase
    .from("recipes")
    .update({ current_version_id: newVersion.id })
    .eq("id", proposal.target_recipe_id);

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
    await supabase.from("recipe_version_ingredients").insert(rows);
  }

  await supabase
    .from("proposals")
    .update({ status: "accepted", decided_at: new Date().toISOString() })
    .eq("id", proposalId);

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath(`/r/${proposal.target_recipe_id}`);
  return {};
}

export async function rejectProposal(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, target_recipe_id, status")
    .eq("id", proposalId)
    .single();

  if (pErr || !proposal) return { error: "Proposal not found" };
  if (proposal.status !== "open") return { error: "Proposal is not open" };

  const { data: targetRecipe } = await supabase
    .from("recipes")
    .select("owner_id")
    .eq("id", proposal.target_recipe_id)
    .single();

  if (!targetRecipe || targetRecipe.owner_id !== user.id) return { error: "Not authorized" };

  await supabase
    .from("proposals")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", proposalId);

  revalidatePath(`/proposals/${proposalId}`);
  return {};
}

export async function addProposalComment(proposalId: string, body: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("proposal_comments").insert({
    proposal_id: proposalId,
    author_id: user.id,
    body: body.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/proposals/${proposalId}`);
  return {};
}
