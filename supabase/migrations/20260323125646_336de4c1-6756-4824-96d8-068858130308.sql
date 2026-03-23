
-- Fix "Audit Logs Writable by Any Authenticated User" warning
-- Scope INSERT to parent entity's tenant

-- 1. invitation_audit_log
DROP POLICY IF EXISTS "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert invitation_audit_log" ON public.invitation_audit_log;

CREATE POLICY "Tenant members can insert invitation_audit_log"
  ON public.invitation_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invitation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = invitation_audit_log.invitation_id
        AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id))
    )
  );

-- 2. financial_audit_log
DROP POLICY IF EXISTS "Authenticated can insert financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Tenant members can insert financial_audit_log" ON public.financial_audit_log;

CREATE POLICY "Tenant members can insert financial_audit_log"
  ON public.financial_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    transaction_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.financial_transactions ft
      WHERE ft.id = financial_audit_log.transaction_id
        AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
    )
  );
