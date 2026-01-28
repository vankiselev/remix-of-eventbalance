-- Super admin RPC functions for managing all tenants
-- Only accessible by users with is_super_admin = true

BEGIN;

-- RPC function to get all tenants (super admin only)
CREATE OR REPLACE FUNCTION public.get_all_tenants_admin()
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
  
  IF NOT is_superadmin THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;
  
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'slug', t.slug,
      'name', t.name,
      'logo_url', t.logo_url,
      'is_active', t.is_active,
      'plan', t.plan,
      'trial_ends_at', t.trial_ends_at,
      'created_at', t.created_at,
      'members_count', (
        SELECT COUNT(*) FROM tenant_memberships tm 
        WHERE tm.tenant_id = t.id AND tm.status = 'active'
      )
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb) INTO result
  FROM tenants t;
  
  RETURN result;
END;
$$;

-- RPC function to get super admin stats
CREATE OR REPLACE FUNCTION public.get_super_admin_stats()
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
  
  IF NOT is_superadmin THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;
  
  SELECT jsonb_build_object(
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'active_tenants', (SELECT COUNT(*) FROM tenants WHERE is_active = true),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_memberships', (SELECT COUNT(*) FROM tenant_memberships WHERE status = 'active')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Update RLS policy for tenants to allow super admin full access
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

COMMIT;
