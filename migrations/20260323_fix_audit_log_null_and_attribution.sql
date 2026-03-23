-- Fix: Audit Log INSERT Allows NULL Reference and Cross-User Attribution
-- 1. Require non-NULL parent reference
-- 2. Enforce user attribution = auth.uid()

-- ============================================================
-- 1. financial_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Audit log insert own transactions" ON public.financial_audit_log;

CREATE POLICY "Audit log insert own transactions"
  ON public.financial_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND transaction_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.financial_transactions ft
      WHERE ft.id = financial_audit_log.transaction_id
        AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
    )
  );

-- ============================================================
-- 2. invitation_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert invitation_audit_log" ON public.invitation_audit_log;
DROP POLICY IF EXISTS "Audit log insert own invitations" ON public.invitation_audit_log;

CREATE POLICY "Audit log insert own invitations"
  ON public.invitation_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND invitation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = invitation_audit_log.invitation_id
        AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id))
    )
  );
