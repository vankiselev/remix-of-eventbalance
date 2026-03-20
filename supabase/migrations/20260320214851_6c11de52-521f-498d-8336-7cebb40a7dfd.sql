
-- Create RPC function to get user tenant memberships
CREATE OR REPLACE FUNCTION public.get_user_tenant_memberships()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', tm.id,
      'tenant_id', tm.tenant_id,
      'user_id', tm.user_id,
      'role_id', null,
      'is_owner', (tm.role = 'owner'),
      'status', 'active',
      'joined_at', tm.created_at,
      'tenant', jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'name', t.name,
        'logo_url', null,
        'settings', '{}'::jsonb,
        'is_active', true,
        'plan', 'free',
        'trial_ends_at', null,
        'created_at', t.created_at
      )
    )
  ) INTO result
  FROM public.tenant_memberships tm
  JOIN public.tenants t ON tm.tenant_id = t.id
  WHERE tm.user_id = auth.uid();

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Create get_tenant_by_slug RPC for super admin access
CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'name', t.name,
    'logo_url', null,
    'settings', '{}'::jsonb,
    'is_active', true,
    'plan', 'free',
    'trial_ends_at', null,
    'created_at', t.created_at
  ) INTO result
  FROM public.tenants t
  WHERE t.slug = _slug
  LIMIT 1;

  RETURN result;
END;
$$;

-- Seed a default tenant if none exists
INSERT INTO public.tenants (id, name, slug)
SELECT 
  'a0000000-0000-0000-0000-000000000001',
  'Основная компания',
  'main'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1);

-- Create memberships for all existing users (from profiles) who don't have one yet
INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
SELECT 
  (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1),
  p.id,
  'member'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_memberships tm WHERE tm.user_id = p.id
)
AND EXISTS (SELECT 1 FROM public.tenants);
