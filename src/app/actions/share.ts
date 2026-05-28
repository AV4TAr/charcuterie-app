"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function getOrCreateShareToken(recipeId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("recipe_share_tokens")
    .select("token")
    .eq("recipe_id", recipeId)
    .eq("created_by", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) return existing.token;

  const token = randomBytes(16).toString("base64url");
  const { error } = await supabase
    .from("recipe_share_tokens")
    .insert({ token, recipe_id: recipeId, created_by: user.id });

  if (error) throw new Error("Failed to create share token: " + error.message);
  return token;
}

export async function revokeShareToken(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("recipe_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("recipe_id", recipeId)
    .eq("created_by", user.id)
    .is("revoked_at", null);
}
