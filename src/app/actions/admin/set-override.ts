"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { assertAdmin, logAdminAction } from "@/lib/admin";

export type OverrideInput = {
  userId: string;
  plan?: string | null;
  trialLimit?: number | null;
  analysesLimit?: number | null;
  importsLimit?: number | null;
  chatDailyLimit?: number | null;
  note?: string | null;
};

export async function upsertPlanOverride(input: OverrideInput): Promise<void> {
  const { userId: adminId } = await assertAdmin();
  const service = createServiceClient();

  // Read current row for audit detail
  const { data: before } = await service
    .from("user_plan_overrides")
    .select("*")
    .eq("user_id", input.userId)
    .maybeSingle();

  const row = {
    user_id: input.userId,
    plan: emptyToNull(input.plan),
    trial_limit: input.trialLimit ?? null,
    analyses_limit: input.analysesLimit ?? null,
    imports_limit: input.importsLimit ?? null,
    chat_daily_limit: input.chatDailyLimit ?? null,
    note: emptyToNull(input.note),
    created_by: before ? before.created_by : adminId,
    updated_at: new Date().toISOString(),
  };

  await logAdminAction({
    adminId,
    action: "override_limit",
    targetUserId: input.userId,
    details: { before, after: row },
  });

  const { error } = await service
    .from("user_plan_overrides")
    .upsert(row, { onConflict: "user_id" });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/users/${input.userId}`);
  revalidatePath("/admin/users");
}

export async function clearPlanOverride(userId: string): Promise<void> {
  const { userId: adminId } = await assertAdmin();
  const service = createServiceClient();

  const { data: before } = await service
    .from("user_plan_overrides")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  await logAdminAction({
    adminId,
    action: "override_limit",
    targetUserId: userId,
    details: { before, after: null, cleared: true },
  });

  const { error } = await service.from("user_plan_overrides").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}
