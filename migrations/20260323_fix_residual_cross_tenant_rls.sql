-- ============================================================
-- FIX: Residual Cross-Tenant & Notification Spoofing Vulnerabilities
-- Targets: notifications, profiles, user_projects, warehouse_settings
-- ============================================================

-- 1. Helper function: check if caller shares a tenant with target user
-- Needed for notifications INSERT (cross-user within same tenant)
CREATE OR REPLACE FUNCTION public.shares_tenant_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm1
    JOIN public.tenant_memberships tm2 ON tm1.tenant_id = tm2.tenant_id
    WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = target_user_id
  )
$$;

-- ============================================================
-- 2. NOTIFICATIONS — restrict INSERT to self or same-tenant members
-- OLD: WITH CHECK (true) — any authenticated user could spoof
-- NEW: caller can only insert for themselves OR for users in the same tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Tenant members can insert notifications"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.shares_tenant_with(user_id)
  );

-- ============================================================
-- 3. PROFILES — restrict INSERT to own profile only
-- OLD: WITH CHECK (true) — any authenticated user could create profile for any UUID
-- NEW: only for own auth.uid()
-- Edge functions use service_role and bypass RLS
-- ============================================================
DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 4. USER_PROJECTS — restrict SELECT to own records
-- OLD: USING (true) — all user↔project associations visible cross-tenant
-- NEW: user can only see their own project assignments
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.user_projects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read user_projects" ON public.user_projects';
    EXECUTE 'CREATE POLICY "Users can read own user_projects" ON public.user_projects FOR SELECT TO authenticated USING (user_id = auth.uid())';
  END IF;
END;
$$;

-- ============================================================
-- 5. WAREHOUSE_SETTINGS — restrict SELECT through parent warehouse tenant
-- OLD: USING (true) — all warehouse settings readable by everyone
-- NEW: only if the parent warehouse belongs to caller's tenant
-- ============================================================
DROP POLICY IF EXISTS "Tenant members can read warehouse_settings" ON public.warehouse_settings;
CREATE POLICY "Tenant members can read warehouse_settings"
  ON public.warehouse_settings
  FOR SELECT TO authenticated
  USING (
    warehouse_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_settings.warehouse_id
        AND (w.tenant_id IS NULL OR public.is_tenant_member(w.tenant_id))
    )
  );
