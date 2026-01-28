-- Phase 1: Multi-tenancy Foundation - RPC functions for frontend
-- These functions allow the frontend to query tenant data before types are regenerated

BEGIN;

-- RPC function to get user's tenant memberships with tenant data
CREATE OR REPLACE FUNCTION public.get_user_tenant_memberships()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', tm.id,
      'tenant_id', tm.tenant_id,
      'user_id', tm.user_id,
      'role_id', tm.role_id,
      'is_owner', tm.is_owner,
      'status', tm.status,
      'joined_at', tm.joined_at,
      'tenant', jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'name', t.name,
        'logo_url', t.logo_url,
        'settings', t.settings,
        'is_active', t.is_active,
        'plan', t.plan,
        'trial_ends_at', t.trial_ends_at,
        'created_at', t.created_at
      )
    )
  ), '[]'::jsonb) INTO result
  FROM tenant_memberships tm
  JOIN tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = auth.uid()
    AND tm.status = 'active'
    AND t.is_active = true;
  
  RETURN result;
END;
$$;

-- RPC function to get tenant by slug (for super admins)
CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  is_superadmin boolean;
BEGIN
  -- Check if user is super admin
  SELECT COALESCE(is_super_admin, false) INTO is_superadmin
  FROM profiles
  WHERE id = auth.uid();
  
  -- If not super admin, check membership
  IF NOT is_superadmin THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_memberships tm
      JOIN tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND t.slug = _slug
        AND tm.status = 'active'
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  
  SELECT jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'name', t.name,
    'logo_url', t.logo_url,
    'settings', t.settings,
    'is_active', t.is_active,
    'plan', t.plan,
    'trial_ends_at', t.trial_ends_at,
    'created_at', t.created_at
  ) INTO result
  FROM tenants t
  WHERE t.slug = _slug
    AND t.is_active = true;
  
  RETURN result;
END;
$$;

-- RPC function to check if slug is available
CREATE OR REPLACE FUNCTION public.is_tenant_slug_available(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM tenants WHERE slug = _slug
  );
$$;

COMMIT;
