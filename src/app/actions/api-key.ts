"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export async function saveApiKey(key: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk-ant-")) {
    return { ok: false, error: "invalid_format" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  let encrypted: string;
  try {
    encrypted = encryptSecret(trimmed);
  } catch (e) {
    console.error("[saveApiKey] encryption failed:", e);
    return { ok: false, error: "encryption_not_configured" };
  }

  const { error } = await supabase
    .from("user_api_keys")
    .upsert(
      { user_id: user.id, encrypted_key: encrypted, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[saveApiKey] supabase error:", error);
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return { ok: false, error: "table_missing" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteApiKey(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id);
  if (error) {
    console.error("[deleteApiKey] supabase error:", error);
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return { ok: false, error: "table_missing" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}
