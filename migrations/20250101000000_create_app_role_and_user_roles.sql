-- =====================================================
-- Create app_role enum and user_roles table
-- These are prerequisites for the RBAC system
-- =====================================================

-- Create app_role enum type
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM (
  'super_admin',
  'admin',
  'employee',
  'contractor',
  'animator'
);

-- Create user_roles table (old role system, used before user_role_assignments)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_at ON public.user_roles(revoked_at) WHERE revoked_at IS NULL;

-- RLS policies (admins can view/manage all roles)
CREATE POLICY "Admins can view all user_roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
        AND ur.revoked_at IS NULL
    )
  );

CREATE POLICY "Admins can manage user_roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
        AND ur.revoked_at IS NULL
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());
