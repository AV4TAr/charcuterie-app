"use server";

import { createClient } from "@/lib/supabase/server";

export async function setRecipeVisibility(
  recipeId: string,
  visibility: "public" | "private",
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipes")
    .update({ visibility })
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
}
