-- Phase 1: Multi-tenancy Foundation - Add super admin flag and helper functions
-- Creates helper functions for tenant isolation in RLS policies

BEGIN;

-- Add is_super_admin to profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create index for super admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(id) WHERE is_super_admin = true;

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

-- Helper function: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
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
