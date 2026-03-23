
-- ============================================================
-- TENANT ISOLATION: Replace permissive RLS with tenant-scoped policies
-- ============================================================

-- 1. Create SECURITY DEFINER helper to check tenant membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  )
$$;

-- ============================================================
-- TENANT_MEMBERSHIPS — user sees only their own memberships
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "Users can read own tenant_memberships" ON public.tenant_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- PROFILES — tenant-scoped read, user can update own
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Tenant members can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL
    OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
CREATE POLICY "Users can update own profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (
    id = (SELECT id FROM public.profiles WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- FINANCIAL_TRANSACTIONS — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.financial_transactions;
CREATE POLICY "Tenant members can read transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert transactions" ON public.financial_transactions;
CREATE POLICY "Tenant members can insert transactions" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can update transactions" ON public.financial_transactions;
CREATE POLICY "Tenant members can update transactions" ON public.financial_transactions
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can delete transactions" ON public.financial_transactions;
CREATE POLICY "Tenant members can delete transactions" ON public.financial_transactions
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- EVENTS — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read events" ON public.events;
CREATE POLICY "Tenant members can read events" ON public.events
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert events" ON public.events;
CREATE POLICY "Tenant members can insert events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can update events" ON public.events;
CREATE POLICY "Tenant members can update events" ON public.events
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can delete events" ON public.events;
CREATE POLICY "Tenant members can delete events" ON public.events
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- EVENT_REPORTS — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read event_reports" ON public.event_reports;
CREATE POLICY "Tenant members can read event_reports" ON public.event_reports
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert event_reports" ON public.event_reports;
CREATE POLICY "Tenant members can insert event_reports" ON public.event_reports
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can update event_reports" ON public.event_reports;
CREATE POLICY "Tenant members can update event_reports" ON public.event_reports
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can delete event_reports" ON public.event_reports;
CREATE POLICY "Tenant members can delete event_reports" ON public.event_reports
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- EVENT_REPORT_SALARIES — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read event_report_salaries" ON public.event_report_salaries;
CREATE POLICY "Tenant members can read event_report_salaries" ON public.event_report_salaries
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert event_report_salaries" ON public.event_report_salaries;
CREATE POLICY "Tenant members can insert event_report_salaries" ON public.event_report_salaries
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can update event_report_salaries" ON public.event_report_salaries;
CREATE POLICY "Tenant members can update event_report_salaries" ON public.event_report_salaries
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can delete event_report_salaries" ON public.event_report_salaries;
CREATE POLICY "Tenant members can delete event_report_salaries" ON public.event_report_salaries
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- VACATIONS — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read vacations" ON public.vacations;
CREATE POLICY "Tenant members can read vacations" ON public.vacations
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert vacations" ON public.vacations;
CREATE POLICY "Tenant members can insert vacations" ON public.vacations
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can update vacations" ON public.vacations;
CREATE POLICY "Tenant members can update vacations" ON public.vacations
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can delete vacations" ON public.vacations;
CREATE POLICY "Tenant members can delete vacations" ON public.vacations
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- INVITATIONS — tenant-scoped all ops
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read invitations" ON public.invitations;
CREATE POLICY "Tenant members can read invitations" ON public.invitations
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can insert invitations" ON public.invitations;
CREATE POLICY "Tenant members can insert invitations" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can update invitations" ON public.invitations;
CREATE POLICY "Tenant members can update invitations" ON public.invitations
  FOR UPDATE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can delete invitations" ON public.invitations;
CREATE POLICY "Tenant members can delete invitations" ON public.invitations
  FOR DELETE TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- TASKS — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read tasks" ON public.tasks;
CREATE POLICY "Tenant members can read tasks" ON public.tasks
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- EMPLOYEES — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read employees" ON public.employees;
CREATE POLICY "Tenant members can read employees" ON public.employees
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- SALARY tables — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read salary_settings" ON public.salary_settings;
CREATE POLICY "Tenant members can read salary_settings" ON public.salary_settings
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read salary_payments" ON public.salary_payments;
CREATE POLICY "Tenant members can read salary_payments" ON public.salary_payments
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read salary_advances" ON public.salary_advances;
CREATE POLICY "Tenant members can read salary_advances" ON public.salary_advances
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- DIRECTORY tables (animators, clients, contractors, contact_persons, venues)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read animators" ON public.animators;
CREATE POLICY "Tenant members can read animators" ON public.animators
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
CREATE POLICY "Tenant members can read clients" ON public.clients
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read contractors" ON public.contractors;
CREATE POLICY "Tenant members can read contractors" ON public.contractors
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read contact_persons" ON public.contact_persons;
CREATE POLICY "Tenant members can read contact_persons" ON public.contact_persons
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read venues" ON public.venues;
CREATE POLICY "Tenant members can read venues" ON public.venues
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- PROJECTS — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read projects" ON public.projects;
CREATE POLICY "Tenant members can read projects" ON public.projects
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- WAREHOUSE tables — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read warehouses" ON public.warehouses;
CREATE POLICY "Tenant members can read warehouses" ON public.warehouses
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read warehouse_items" ON public.warehouse_items;
CREATE POLICY "Tenant members can read warehouse_items" ON public.warehouse_items
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read warehouse_tasks" ON public.warehouse_tasks;
CREATE POLICY "Tenant members can read warehouse_tasks" ON public.warehouse_tasks
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Authenticated can read warehouse_settings" ON public.warehouse_settings;
CREATE POLICY "Tenant members can read warehouse_settings" ON public.warehouse_settings
  FOR SELECT TO authenticated USING (true);
-- warehouse_settings has no tenant_id, kept as-is

-- ============================================================
-- FINANCIAL_REPORTS — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read financial_reports" ON public.financial_reports;
CREATE POLICY "Tenant members can read financial_reports" ON public.financial_reports
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- BUDGET_ITEMS — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read budget_items" ON public.budget_items;
CREATE POLICY "Tenant members can read budget_items" ON public.budget_items
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- USER_ROLE_ASSIGNMENTS — tenant-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read user_role_assignments" ON public.user_role_assignments;
CREATE POLICY "Tenant members can read user_role_assignments" ON public.user_role_assignments
  FOR SELECT TO authenticated USING (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

DROP POLICY IF EXISTS "Users can insert user_role_assignments" ON public.user_role_assignments;
CREATE POLICY "Tenant members can insert user_role_assignments" ON public.user_role_assignments
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IS NULL OR public.is_tenant_member(tenant_id)
  );

-- ============================================================
-- EVENT_PARTICIPANTS — no tenant_id, scoped via event's tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read event_participants" ON public.event_participants;
CREATE POLICY "Tenant members can read event_participants" ON public.event_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND (e.tenant_id IS NULL OR public.is_tenant_member(e.tenant_id))
    )
  );

-- ============================================================
-- TRANSACTION_ATTACHMENTS — no tenant_id, scoped via transaction's tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read transaction_attachments" ON public.transaction_attachments;
CREATE POLICY "Tenant members can read transaction_attachments" ON public.transaction_attachments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.financial_transactions ft
      WHERE ft.id = transaction_id
      AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
    )
  );

-- ============================================================
-- AUDIT LOGS — tenant-scoped via parent tables
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read audit log" ON public.financial_audit_log;
CREATE POLICY "Tenant members can read financial_audit_log" ON public.financial_audit_log
  FOR SELECT TO authenticated USING (
    transaction_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.financial_transactions ft
      WHERE ft.id = transaction_id
      AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.financial_audit_log;
CREATE POLICY "Authenticated can insert financial_audit_log" ON public.financial_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read invitation_audit_log" ON public.invitation_audit_log;
CREATE POLICY "Tenant members can read invitation_audit_log" ON public.invitation_audit_log
  FOR SELECT TO authenticated USING (
    invitation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = invitation_id
      AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log;
CREATE POLICY "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- PROFILE_EDIT_HISTORY — tenant-scoped via profile
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read profile_edit_history" ON public.profile_edit_history;
CREATE POLICY "Tenant members can read profile_edit_history" ON public.profile_edit_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id
      AND (p.tenant_id IS NULL OR public.is_tenant_member(p.tenant_id))
    )
  );

-- ============================================================
-- USER_PROJECTS — no tenant_id, keep global read for now
-- ============================================================
-- user_projects has no tenant_id column, access controlled via projects table

-- ============================================================
-- TABLES INTENTIONALLY LEFT AS GLOBAL READ:
-- tenants: reference table, users need to see tenant info for switching
-- role_definitions: global reference, no sensitive data
-- system_secrets: already service_role only
-- notifications: already user_id scoped (auth.uid() = user_id)
-- push_subscriptions: already user_id scoped
-- overdue_report_settings: already user_id scoped  
-- api_keys: already user_id scoped
-- user_voice_settings: already user_id scoped
-- ============================================================
