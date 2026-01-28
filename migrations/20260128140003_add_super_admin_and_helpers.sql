-- Phase 1: Multi-tenancy Foundation - Add helper functions for tenant isolation
-- NOTE: is_super_admin column and is_super_admin() function already created in 140000

BEGIN;

-- Helper function: Check if user belongs to a tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND status = 'active'
  );
$$;

-- Helper function: Check if user is tenant owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND is_owner = true
      AND status = 'active'
  );
$$;

-- Helper function: Get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(tenant_id),
    ARRAY[]::uuid[]
  )
  FROM public.tenant_memberships
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

-- Helper function: Check if user has role in tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id uuid, _role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships tm
    JOIN public.role_definitions rd ON rd.id = tm.role_id
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = _tenant_id
      AND tm.status = 'active'
      AND rd.code = _role_code
  );
$$;

-- Helper function: Check if user is admin in tenant (owner or admin role)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships tm
    LEFT JOIN public.role_definitions rd ON rd.id = tm.role_id
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = _tenant_id
      AND tm.status = 'active'
      AND (tm.is_owner = true OR rd.is_admin_role = true)
  );
$$;

COMMIT;
