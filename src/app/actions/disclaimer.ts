"use server";

import { createClient } from "@/lib/supabase/server";

export async function acceptDonMarcoDisclaimer(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase
    .from("profiles")
    .update({ don_marco_accepted_at: new Date().toISOString() })
    .eq("id", user.id);
}
