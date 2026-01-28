-- Phase 1: Multi-tenancy Foundation - Create tenant_memberships table
-- Links users to tenants with their roles within each tenant

BEGIN;

-- Create tenant_memberships table
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES public.role_definitions(id) ON DELETE SET NULL,
  is_owner boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_at timestamp with time zone,
  joined_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tenant_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_memberships_updated_at ON public.tenant_memberships;
CREATE TRIGGER trg_tenant_memberships_updated_at
  BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_memberships_updated_at();

-- Enable RLS
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_memberships

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.tenant_memberships FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view memberships in their tenants (for seeing colleagues)
CREATE POLICY "Users can view memberships in their tenants"
ON public.tenant_memberships FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tm.tenant_id FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

-- Tenant owners/admins can manage memberships in their tenant
CREATE POLICY "Tenant owners can manage memberships"
ON public.tenant_memberships FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships owner_tm
    WHERE owner_tm.tenant_id = tenant_memberships.tenant_id
      AND owner_tm.user_id = auth.uid()
      AND owner_tm.is_owner = true
      AND owner_tm.status = 'active'
  )
);

-- Super admins can manage all memberships
CREATE POLICY "Super admins can manage all memberships"
ON public.tenant_memberships FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON public.tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON public.tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_status ON public.tenant_memberships(status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_owner ON public.tenant_memberships(tenant_id, is_owner) WHERE is_owner = true;

COMMIT;
