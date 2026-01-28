-- Phase 1: Multi-tenancy Foundation - Create default tenant for existing data
-- This migration creates a default tenant and prepares for data migration

BEGIN;

-- Create default tenant for existing data
INSERT INTO public.tenants (id, slug, name, plan, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'default',
  'Default Company',
  'pro',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Store default tenant ID for use in subsequent migrations
-- This comment serves as documentation: DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

-- Migrate existing users to default tenant
-- Insert all existing profiles as members of default tenant
INSERT INTO public.tenant_memberships (tenant_id, user_id, is_owner, status, joined_at)
SELECT 
  'a0000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  COALESCE(
    -- Check if user has admin role - make them owners
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = p.id AND rd.is_admin_role = true
    ),
    false
  ),
  CASE 
    WHEN p.employment_status = 'terminated' THEN 'suspended'
    ELSE 'active'
  END,
  p.created_at
FROM public.profiles p
WHERE p.id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Link existing role assignments to the default tenant membership
UPDATE public.tenant_memberships tm
SET role_id = (
  SELECT ura.role_id 
  FROM public.user_role_assignments ura 
  WHERE ura.user_id = tm.user_id
  LIMIT 1
)
WHERE tm.tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND tm.role_id IS NULL;

COMMIT;
