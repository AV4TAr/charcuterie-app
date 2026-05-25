"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = (formData.get("display_name") as string | null)?.trim() || null;
  const bio = (formData.get("bio") as string | null)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
