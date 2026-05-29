-- Admin panel infrastructure (Fase 1)
-- See docs/administracion.md for the full strategy.

-- 1) Superadmin flag on profiles. SET-ONLY-VIA-SQL — no app code modifies it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- 2) Append-only audit log of admin actions.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid        NOT NULL REFERENCES auth.users(id),
  action          text        NOT NULL,
  target_user_id  uuid        REFERENCES auth.users(id),
  details         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_admin_id_idx
  ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_id_idx
  ON public.admin_audit_log(target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read their own actions. No other reads from app code.
CREATE POLICY "admins read own audit log"
  ON public.admin_audit_log FOR SELECT
  USING (auth.uid() = admin_id);

-- No INSERT/UPDATE/DELETE policies → only service role writes via server actions.

-- 3) Per-user overrides of plan limits (early adopters, testers, comps).
CREATE TABLE IF NOT EXISTS public.user_plan_overrides (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan              text,           -- forces a specific plan (overrides subscriptions)
  trial_limit       int,            -- overrides the 10 free trial pool (null = default)
  analyses_limit    int,            -- per recipe version (null = default for plan)
  imports_limit     int,            -- per recipe version (null = default for plan)
  chat_daily_limit  int,            -- messages/day in don-marco chat (null = default)
  note              text,           -- internal note, admin-only
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plan_overrides ENABLE ROW LEVEL SECURITY;

-- No policies → table is only accessible via the service role.
-- App-side reads must go through src/lib/admin.ts or src/lib/subscription.ts (with service client).
