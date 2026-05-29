import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminAction =
  | "change_plan"
  | "override_limit"
  | "reset_trial"
  | "view_user"
  | "ban_user"
  | "unban_user"
  | "add_note";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  return !!data?.is_superadmin;
}

export async function assertAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (!data?.is_superadmin) throw new Error("Unauthorized");

  return { userId: user.id };
}

export async function logAdminAction(params: {
  adminId: string;
  action: AdminAction;
  targetUserId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.from("admin_audit_log").insert({
    admin_id: params.adminId,
    action: params.action,
    target_user_id: params.targetUserId ?? null,
    details: params.details ?? {},
    ip_address: params.ipAddress ?? null,
  });
  if (error) throw new Error(`Audit log insert failed: ${error.message}`);
}
