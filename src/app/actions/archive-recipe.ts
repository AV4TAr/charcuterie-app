"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function archiveRecipe(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipes")
    .update({ archived_at: new Date().toISOString(), visibility: "private" })
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/library");
  revalidatePath(`/r/${recipeId}`);
}

export async function restoreRecipe(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipes")
    .update({ archived_at: null })
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/library");
  revalidatePath(`/r/${recipeId}`);
}
