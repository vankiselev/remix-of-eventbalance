-- Phase 1: Multi-tenancy Foundation - Create tenants table
-- This migration creates the core tenants table for multi-company support

BEGIN;

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,  -- "fantasykids" for URL routing
  name text NOT NULL,          -- "Fantasy Kids" display name
  logo_url text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  trial_ends_at timestamp with time zone,
  plan text DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add constraint for slug format (lowercase letters, numbers, hyphens only)
ALTER TABLE public.tenants
ADD CONSTRAINT tenants_slug_format_check 
CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$');

-- Create updated_at trigger for tenants
CREATE OR REPLACE FUNCTION public.update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenants_updated_at();

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
-- All authenticated users can read active tenants (for tenant selection)
CREATE POLICY "Authenticated users can view active tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (is_active = true);

-- Super admins can manage all tenants
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Tenant owners can update their own tenant
CREATE POLICY "Tenant owners can update their tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = tenants.id
      AND user_id = auth.uid()
      AND is_owner = true
      AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = tenants.id
      AND user_id = auth.uid()
      AND is_owner = true
      AND status = 'active'
  )
);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON public.tenants(is_active);

COMMIT;
