-- Phase 2: Update RLS policies for tenant isolation (Part 4)
-- This migration updates RLS policies to enforce tenant isolation

BEGIN;

-- ============================================
-- CLIENTS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for clients" ON public.clients;
CREATE POLICY "Tenant isolation for clients"
ON public.clients FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- ANIMATORS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for animators" ON public.animators;
CREATE POLICY "Tenant isolation for animators"
ON public.animators FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- CONTRACTORS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for contractors" ON public.contractors;
CREATE POLICY "Tenant isolation for contractors"
ON public.contractors FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- VENUES table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for venues" ON public.venues;
CREATE POLICY "Tenant isolation for venues"
ON public.venues FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- EVENTS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for events" ON public.events;
CREATE POLICY "Tenant isolation for events"
ON public.events FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- EMPLOYEES table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for employees" ON public.employees;
CREATE POLICY "Tenant isolation for employees"
ON public.employees FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- FINANCIAL_TRANSACTIONS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for financial_transactions" ON public.financial_transactions;
CREATE POLICY "Tenant isolation for financial_transactions"
ON public.financial_transactions FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- FINANCIAL_REPORTS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for financial_reports" ON public.financial_reports;
CREATE POLICY "Tenant isolation for financial_reports"
ON public.financial_reports FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- EVENT_REPORTS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for event_reports" ON public.event_reports;
CREATE POLICY "Tenant isolation for event_reports"
ON public.event_reports FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- TASKS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for tasks" ON public.tasks;
CREATE POLICY "Tenant isolation for tasks"
ON public.tasks FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- VACATIONS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for vacations" ON public.vacations;
CREATE POLICY "Tenant isolation for vacations"
ON public.vacations FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- WAREHOUSE_ITEMS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for warehouse_items" ON public.warehouse_items;
CREATE POLICY "Tenant isolation for warehouse_items"
ON public.warehouse_items FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- WAREHOUSE_TASKS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for warehouse_tasks" ON public.warehouse_tasks;
CREATE POLICY "Tenant isolation for warehouse_tasks"
ON public.warehouse_tasks FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- CATEGORY_ICONS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for category_icons" ON public.category_icons;
CREATE POLICY "Tenant isolation for category_icons"
ON public.category_icons FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

-- ============================================
-- INVITATIONS table RLS
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation for invitations" ON public.invitations;
CREATE POLICY "Tenant isolation for invitations"
ON public.invitations FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
)
WITH CHECK (
  public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin()
);

COMMIT;
