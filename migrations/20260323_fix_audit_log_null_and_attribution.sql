-- Fix: Audit Log INSERT Allows NULL Reference and Cross-User Attribution
-- Schema-safe: handles both Cloud (user_id) and self-hosted (changed_by) columns

-- ============================================================
-- 1. financial_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Audit log insert own transactions" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can insert their own financial audit logs" ON public.financial_audit_log;

DO $$
DECLARE
  has_user_id boolean;
  has_changed_by boolean;
  policy_check text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='financial_audit_log' AND column_name='user_id'
  ) INTO has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='financial_audit_log' AND column_name='changed_by'
  ) INTO has_changed_by;

  -- Build actor attribution clause based on actual schema
  IF has_user_id THEN
    policy_check := 'user_id = auth.uid() AND transaction_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.financial_transactions ft WHERE ft.id = financial_audit_log.transaction_id AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id)))';
  ELSIF has_changed_by THEN
    policy_check := 'changed_by = auth.uid() AND transaction_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.financial_transactions ft WHERE ft.id = financial_audit_log.transaction_id AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id)))';
  ELSE
    -- No actor column: enforce parent-scoped only
    policy_check := 'transaction_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.financial_transactions ft WHERE ft.id = financial_audit_log.transaction_id AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id)))';
    RAISE NOTICE 'financial_audit_log has no actor column (user_id/changed_by) — attribution check skipped';
  END IF;

  EXECUTE format(
    'CREATE POLICY "Audit log insert own transactions" ON public.financial_audit_log FOR INSERT TO authenticated WITH CHECK (%s)',
    policy_check
  );
END;
$$;

-- ============================================================
-- 2. invitation_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert invitation_audit_log" ON public.invitation_audit_log;
DROP POLICY IF EXISTS "Audit log insert own invitations" ON public.invitation_audit_log;

DO $$
DECLARE
  has_actor_id boolean;
  policy_check text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitation_audit_log' AND column_name='actor_id'
  ) INTO has_actor_id;

  IF has_actor_id THEN
    policy_check := 'actor_id = auth.uid() AND invitation_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_audit_log.invitation_id AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id)))';
  ELSE
    policy_check := 'invitation_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_audit_log.invitation_id AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id)))';
    RAISE NOTICE 'invitation_audit_log has no actor_id column — attribution check skipped';
  END IF;

  EXECUTE format(
    'CREATE POLICY "Audit log insert own invitations" ON public.invitation_audit_log FOR INSERT TO authenticated WITH CHECK (%s)',
    policy_check
  );
END;
$$;
