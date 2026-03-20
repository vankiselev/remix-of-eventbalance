-- Fix infinite recursion in tenant_memberships RLS policies
-- Uses SECURITY DEFINER functions to bypass RLS when checking membership/ownership

BEGIN;

-- 1) Helper: check if user is a member of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  );
$$;

-- 2) Helper: check if user is an owner of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND is_owner = true
  );
$$;

-- 3) Drop recursive policies on tenant_memberships
DROP POLICY IF EXISTS "Users can view memberships in their tenants" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Tenant owners can manage memberships" ON public.tenant_memberships;

-- 4) Recreate with SECURITY DEFINER functions
CREATE POLICY "Users can view memberships in their tenants"
ON public.tenant_memberships FOR SELECT
TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant owners can manage memberships"
ON public.tenant_memberships FOR ALL
TO authenticated
USING (public.is_tenant_owner(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_owner(auth.uid(), tenant_id));

-- 5) Fix same issue on tenants table
DROP POLICY IF EXISTS "Tenant owners can update their tenant" ON public.tenants;
CREATE POLICY "Tenant owners can update their tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (public.is_tenant_owner(auth.uid(), id))
WITH CHECK (public.is_tenant_owner(auth.uid(), id));

COMMIT;
