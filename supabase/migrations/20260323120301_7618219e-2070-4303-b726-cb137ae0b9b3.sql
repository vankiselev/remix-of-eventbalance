
-- ============================================================
-- TENANT ISOLATION: Replace permissive RLS with tenant-scoped policies
-- Resilient to schema differences between Cloud and self-hosted
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

-- 2. Helper: get all tenant_ids the current user belongs to (for parent-scoped tables)
CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()
$$;

-- ============================================================
-- TENANT_MEMBERSHIPS — user sees only their own memberships
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read tenant_memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Users can read own tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "Users can read own tenant_memberships" ON public.tenant_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Main DO block for conditional policies
-- ============================================================
DO $tenant_isolation$
DECLARE
  has_col boolean;
BEGIN

  -- ============================================================
  -- PROFILES — tenant-scoped if tenant_id exists, otherwise user-membership-scoped
  -- ============================================================
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='tenant_id') INTO has_col;

  DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Tenant members can read profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;

  IF has_col THEN
    -- Cloud: profiles has tenant_id
    CREATE POLICY "Tenant members can read profiles" ON public.profiles
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    CREATE POLICY "Users can insert profiles" ON public.profiles
      FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY "Users can update own profiles" ON public.profiles
      FOR UPDATE TO authenticated USING (
        id = (SELECT p.id FROM public.profiles p WHERE p.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) LIMIT 1)
        OR (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id))
      );
  ELSE
    -- Self-hosted: no tenant_id, scope via user membership
    -- Users can read profiles of people in the same tenant
    CREATE POLICY "Tenant members can read profiles" ON public.profiles
      FOR SELECT TO authenticated USING (
        -- Own profile (by matching auth email)
        email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
        -- Or profiles whose id/user_id share a tenant with the caller
        OR EXISTS (
          SELECT 1 FROM public.tenant_memberships tm1
          JOIN public.tenant_memberships tm2 ON tm1.tenant_id = tm2.tenant_id
          WHERE tm1.user_id = auth.uid()
          AND (tm2.user_id = profiles.id OR tm2.user_id::text = profiles.id::text)
        )
      );

    CREATE POLICY "Users can insert profiles" ON public.profiles
      FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY "Users can update own profiles" ON public.profiles
      FOR UPDATE TO authenticated USING (
        email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
      );
  END IF;

  -- ============================================================
  -- MACRO: tenant-scoped tables with all CRUD
  -- For each: SELECT, INSERT, UPDATE, DELETE scoped by tenant_id
  -- ============================================================

  -- FINANCIAL_TRANSACTIONS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_transactions' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Tenant members can read transactions" ON public.financial_transactions;
    CREATE POLICY "Tenant members can read transactions" ON public.financial_transactions
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Tenant members can insert transactions" ON public.financial_transactions;
    CREATE POLICY "Tenant members can insert transactions" ON public.financial_transactions
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can update transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Tenant members can update transactions" ON public.financial_transactions;
    CREATE POLICY "Tenant members can update transactions" ON public.financial_transactions
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can delete transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Tenant members can delete transactions" ON public.financial_transactions;
    CREATE POLICY "Tenant members can delete transactions" ON public.financial_transactions
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- EVENTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read events" ON public.events;
    DROP POLICY IF EXISTS "Tenant members can read events" ON public.events;
    CREATE POLICY "Tenant members can read events" ON public.events
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert events" ON public.events;
    DROP POLICY IF EXISTS "Tenant members can insert events" ON public.events;
    CREATE POLICY "Tenant members can insert events" ON public.events
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can update events" ON public.events;
    DROP POLICY IF EXISTS "Tenant members can update events" ON public.events;
    CREATE POLICY "Tenant members can update events" ON public.events
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can delete events" ON public.events;
    DROP POLICY IF EXISTS "Tenant members can delete events" ON public.events;
    CREATE POLICY "Tenant members can delete events" ON public.events
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- EVENT_REPORTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_reports' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read event_reports" ON public.event_reports;
    DROP POLICY IF EXISTS "Tenant members can read event_reports" ON public.event_reports;
    CREATE POLICY "Tenant members can read event_reports" ON public.event_reports
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert event_reports" ON public.event_reports;
    DROP POLICY IF EXISTS "Tenant members can insert event_reports" ON public.event_reports;
    CREATE POLICY "Tenant members can insert event_reports" ON public.event_reports
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can update event_reports" ON public.event_reports;
    DROP POLICY IF EXISTS "Tenant members can update event_reports" ON public.event_reports;
    CREATE POLICY "Tenant members can update event_reports" ON public.event_reports
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can delete event_reports" ON public.event_reports;
    DROP POLICY IF EXISTS "Tenant members can delete event_reports" ON public.event_reports;
    CREATE POLICY "Tenant members can delete event_reports" ON public.event_reports
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- EVENT_REPORT_SALARIES
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_report_salaries' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read event_report_salaries" ON public.event_report_salaries;
    DROP POLICY IF EXISTS "Tenant members can read event_report_salaries" ON public.event_report_salaries;
    CREATE POLICY "Tenant members can read event_report_salaries" ON public.event_report_salaries
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert event_report_salaries" ON public.event_report_salaries;
    DROP POLICY IF EXISTS "Tenant members can insert event_report_salaries" ON public.event_report_salaries;
    CREATE POLICY "Tenant members can insert event_report_salaries" ON public.event_report_salaries
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can update event_report_salaries" ON public.event_report_salaries;
    DROP POLICY IF EXISTS "Tenant members can update event_report_salaries" ON public.event_report_salaries;
    CREATE POLICY "Tenant members can update event_report_salaries" ON public.event_report_salaries
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can delete event_report_salaries" ON public.event_report_salaries;
    DROP POLICY IF EXISTS "Tenant members can delete event_report_salaries" ON public.event_report_salaries;
    CREATE POLICY "Tenant members can delete event_report_salaries" ON public.event_report_salaries
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- VACATIONS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vacations' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read vacations" ON public.vacations;
    DROP POLICY IF EXISTS "Tenant members can read vacations" ON public.vacations;
    CREATE POLICY "Tenant members can read vacations" ON public.vacations
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert vacations" ON public.vacations;
    DROP POLICY IF EXISTS "Tenant members can insert vacations" ON public.vacations;
    CREATE POLICY "Tenant members can insert vacations" ON public.vacations
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can update vacations" ON public.vacations;
    DROP POLICY IF EXISTS "Tenant members can update vacations" ON public.vacations;
    CREATE POLICY "Tenant members can update vacations" ON public.vacations
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can delete vacations" ON public.vacations;
    DROP POLICY IF EXISTS "Tenant members can delete vacations" ON public.vacations;
    CREATE POLICY "Tenant members can delete vacations" ON public.vacations
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- INVITATIONS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invitations' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read invitations" ON public.invitations;
    DROP POLICY IF EXISTS "Tenant members can read invitations" ON public.invitations;
    CREATE POLICY "Tenant members can read invitations" ON public.invitations
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Authenticated can insert invitations" ON public.invitations;
    DROP POLICY IF EXISTS "Tenant members can insert invitations" ON public.invitations;
    CREATE POLICY "Tenant members can insert invitations" ON public.invitations
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Authenticated can update invitations" ON public.invitations;
    DROP POLICY IF EXISTS "Tenant members can update invitations" ON public.invitations;
    CREATE POLICY "Tenant members can update invitations" ON public.invitations
      FOR UPDATE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Authenticated can delete invitations" ON public.invitations;
    DROP POLICY IF EXISTS "Tenant members can delete invitations" ON public.invitations;
    CREATE POLICY "Tenant members can delete invitations" ON public.invitations
      FOR DELETE TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- TASKS (SELECT only, write not enabled)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Tenant members can read tasks" ON public.tasks;
    CREATE POLICY "Tenant members can read tasks" ON public.tasks
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- EMPLOYEES
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read employees" ON public.employees;
    DROP POLICY IF EXISTS "Tenant members can read employees" ON public.employees;
    CREATE POLICY "Tenant members can read employees" ON public.employees
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- SALARY_SETTINGS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salary_settings' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read salary_settings" ON public.salary_settings;
    DROP POLICY IF EXISTS "Tenant members can read salary_settings" ON public.salary_settings;
    CREATE POLICY "Tenant members can read salary_settings" ON public.salary_settings
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- SALARY_PAYMENTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salary_payments' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read salary_payments" ON public.salary_payments;
    DROP POLICY IF EXISTS "Tenant members can read salary_payments" ON public.salary_payments;
    CREATE POLICY "Tenant members can read salary_payments" ON public.salary_payments
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- SALARY_ADVANCES
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salary_advances' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read salary_advances" ON public.salary_advances;
    DROP POLICY IF EXISTS "Tenant members can read salary_advances" ON public.salary_advances;
    CREATE POLICY "Tenant members can read salary_advances" ON public.salary_advances
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- ANIMATORS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='animators' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read animators" ON public.animators;
    DROP POLICY IF EXISTS "Tenant members can read animators" ON public.animators;
    CREATE POLICY "Tenant members can read animators" ON public.animators
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- CLIENTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
    DROP POLICY IF EXISTS "Tenant members can read clients" ON public.clients;
    CREATE POLICY "Tenant members can read clients" ON public.clients
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- CONTRACTORS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractors' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read contractors" ON public.contractors;
    DROP POLICY IF EXISTS "Tenant members can read contractors" ON public.contractors;
    CREATE POLICY "Tenant members can read contractors" ON public.contractors
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- CONTACT_PERSONS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contact_persons' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read contact_persons" ON public.contact_persons;
    DROP POLICY IF EXISTS "Tenant members can read contact_persons" ON public.contact_persons;
    CREATE POLICY "Tenant members can read contact_persons" ON public.contact_persons
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- VENUES
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='venues' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read venues" ON public.venues;
    DROP POLICY IF EXISTS "Tenant members can read venues" ON public.venues;
    CREATE POLICY "Tenant members can read venues" ON public.venues
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- PROJECTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read projects" ON public.projects;
    DROP POLICY IF EXISTS "Tenant members can read projects" ON public.projects;
    CREATE POLICY "Tenant members can read projects" ON public.projects
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- WAREHOUSES
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouses' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read warehouses" ON public.warehouses;
    DROP POLICY IF EXISTS "Tenant members can read warehouses" ON public.warehouses;
    CREATE POLICY "Tenant members can read warehouses" ON public.warehouses
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- WAREHOUSE_ITEMS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouse_items' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read warehouse_items" ON public.warehouse_items;
    DROP POLICY IF EXISTS "Tenant members can read warehouse_items" ON public.warehouse_items;
    CREATE POLICY "Tenant members can read warehouse_items" ON public.warehouse_items
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- WAREHOUSE_TASKS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouse_tasks' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read warehouse_tasks" ON public.warehouse_tasks;
    DROP POLICY IF EXISTS "Tenant members can read warehouse_tasks" ON public.warehouse_tasks;
    CREATE POLICY "Tenant members can read warehouse_tasks" ON public.warehouse_tasks
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- FINANCIAL_REPORTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_reports' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read financial_reports" ON public.financial_reports;
    DROP POLICY IF EXISTS "Tenant members can read financial_reports" ON public.financial_reports;
    CREATE POLICY "Tenant members can read financial_reports" ON public.financial_reports
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- BUDGET_ITEMS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='budget_items' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated can read budget_items" ON public.budget_items;
    DROP POLICY IF EXISTS "Tenant members can read budget_items" ON public.budget_items;
    CREATE POLICY "Tenant members can read budget_items" ON public.budget_items
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- USER_ROLE_ASSIGNMENTS
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_role_assignments' AND column_name='tenant_id') INTO has_col;
  IF has_col THEN
    DROP POLICY IF EXISTS "Authenticated users can read user_role_assignments" ON public.user_role_assignments;
    DROP POLICY IF EXISTS "Tenant members can read user_role_assignments" ON public.user_role_assignments;
    CREATE POLICY "Tenant members can read user_role_assignments" ON public.user_role_assignments
      FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

    DROP POLICY IF EXISTS "Users can insert user_role_assignments" ON public.user_role_assignments;
    DROP POLICY IF EXISTS "Tenant members can insert user_role_assignments" ON public.user_role_assignments;
    CREATE POLICY "Tenant members can insert user_role_assignments" ON public.user_role_assignments
      FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
  END IF;

  -- ============================================================
  -- PARENT-SCOPED TABLES (no tenant_id, scoped through parent FK)
  -- ============================================================

  -- EVENT_PARTICIPANTS → parent: events
  DROP POLICY IF EXISTS "Authenticated can read event_participants" ON public.event_participants;
  DROP POLICY IF EXISTS "Tenant members can read event_participants" ON public.event_participants;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read event_participants" ON public.event_participants
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = event_id
          AND (e.tenant_id IS NULL OR public.is_tenant_member(e.tenant_id))
        )
      );
  ELSE
    -- Fallback: allow read for authenticated (events has no tenant_id)
    CREATE POLICY "Tenant members can read event_participants" ON public.event_participants
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- TRANSACTION_ATTACHMENTS → parent: financial_transactions
  DROP POLICY IF EXISTS "Authenticated can read transaction_attachments" ON public.transaction_attachments;
  DROP POLICY IF EXISTS "Tenant members can read transaction_attachments" ON public.transaction_attachments;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_transactions' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read transaction_attachments" ON public.transaction_attachments
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.financial_transactions ft
          WHERE ft.id = transaction_id
          AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
        )
      );
  ELSE
    CREATE POLICY "Tenant members can read transaction_attachments" ON public.transaction_attachments
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- FINANCIAL_AUDIT_LOG → parent: financial_transactions
  DROP POLICY IF EXISTS "Authenticated can read audit log" ON public.financial_audit_log;
  DROP POLICY IF EXISTS "Tenant members can read financial_audit_log" ON public.financial_audit_log;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_transactions' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read financial_audit_log" ON public.financial_audit_log
      FOR SELECT TO authenticated USING (
        transaction_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.financial_transactions ft
          WHERE ft.id = transaction_id
          AND (ft.tenant_id IS NULL OR public.is_tenant_member(ft.tenant_id))
        )
      );
  ELSE
    CREATE POLICY "Tenant members can read financial_audit_log" ON public.financial_audit_log
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Audit log INSERT stays permissive (append-only by design)
  DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.financial_audit_log;
  DROP POLICY IF EXISTS "Authenticated can insert financial_audit_log" ON public.financial_audit_log;
  CREATE POLICY "Authenticated can insert financial_audit_log" ON public.financial_audit_log
    FOR INSERT TO authenticated WITH CHECK (true);

  -- INVITATION_AUDIT_LOG → parent: invitations
  DROP POLICY IF EXISTS "Authenticated can read invitation_audit_log" ON public.invitation_audit_log;
  DROP POLICY IF EXISTS "Tenant members can read invitation_audit_log" ON public.invitation_audit_log;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invitations' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read invitation_audit_log" ON public.invitation_audit_log
      FOR SELECT TO authenticated USING (
        invitation_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.invitations i
          WHERE i.id = invitation_id
          AND (i.tenant_id IS NULL OR public.is_tenant_member(i.tenant_id))
        )
      );
  ELSE
    CREATE POLICY "Tenant members can read invitation_audit_log" ON public.invitation_audit_log
      FOR SELECT TO authenticated USING (true);
  END IF;

  DROP POLICY IF EXISTS "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log;
  CREATE POLICY "Authenticated can insert invitation_audit_log" ON public.invitation_audit_log
    FOR INSERT TO authenticated WITH CHECK (true);

  -- PROFILE_EDIT_HISTORY → parent: profiles
  DROP POLICY IF EXISTS "Authenticated users can read profile_edit_history" ON public.profile_edit_history;
  DROP POLICY IF EXISTS "Tenant members can read profile_edit_history" ON public.profile_edit_history;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read profile_edit_history" ON public.profile_edit_history
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = profile_id
          AND (p.tenant_id IS NULL OR public.is_tenant_member(p.tenant_id))
        )
      );
  ELSE
    -- Fallback: user can read history of profiles they share a tenant with
    CREATE POLICY "Tenant members can read profile_edit_history" ON public.profile_edit_history
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.tenant_memberships tm1
          JOIN public.tenant_memberships tm2 ON tm1.tenant_id = tm2.tenant_id
          WHERE tm1.user_id = auth.uid()
          AND tm2.user_id::text = profile_id::text
        )
      );
  END IF;

  -- WAREHOUSE_SETTINGS → parent: warehouses (via warehouse_id)
  DROP POLICY IF EXISTS "Authenticated can read warehouse_settings" ON public.warehouse_settings;
  DROP POLICY IF EXISTS "Tenant members can read warehouse_settings" ON public.warehouse_settings;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouses' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read warehouse_settings" ON public.warehouse_settings
      FOR SELECT TO authenticated USING (
        warehouse_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.warehouses w
          WHERE w.id = warehouse_id
          AND (w.tenant_id IS NULL OR public.is_tenant_member(w.tenant_id))
        )
      );
  ELSE
    CREATE POLICY "Tenant members can read warehouse_settings" ON public.warehouse_settings
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- USER_PROJECTS → parent: projects (via project_id)
  DROP POLICY IF EXISTS "Authenticated can read user_projects" ON public.user_projects;
  DROP POLICY IF EXISTS "Tenant members can read user_projects" ON public.user_projects;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='tenant_id') THEN
    CREATE POLICY "Tenant members can read user_projects" ON public.user_projects
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_id
          AND (p.tenant_id IS NULL OR public.is_tenant_member(p.tenant_id))
        )
      );
  ELSE
    CREATE POLICY "Tenant members can read user_projects" ON public.user_projects
      FOR SELECT TO authenticated USING (true);
  END IF;

END;
$tenant_isolation$;
