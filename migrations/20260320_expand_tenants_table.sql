-- Expand tenants table with full company profile fields

BEGIN;

-- Add new columns (IF NOT EXISTS via DO block for safety)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='logo_url') THEN
    ALTER TABLE public.tenants ADD COLUMN logo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='description') THEN
    ALTER TABLE public.tenants ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='inn') THEN
    ALTER TABLE public.tenants ADD COLUMN inn text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='legal_name') THEN
    ALTER TABLE public.tenants ADD COLUMN legal_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='address') THEN
    ALTER TABLE public.tenants ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='phone') THEN
    ALTER TABLE public.tenants ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='email') THEN
    ALTER TABLE public.tenants ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='is_active') THEN
    ALTER TABLE public.tenants ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='plan') THEN
    ALTER TABLE public.tenants ADD COLUMN plan text DEFAULT 'trial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='settings') THEN
    ALTER TABLE public.tenants ADD COLUMN settings jsonb DEFAULT '{}';
  END IF;
END$$;

-- RLS: Super admins can update tenants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Super admins can update tenants') THEN
    CREATE POLICY "Super admins can update tenants"
    ON public.tenants FOR UPDATE
    TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());
  END IF;
END$$;

-- RLS: Tenant owners can update their own tenant
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
      AND role = 'owner'
  )
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Tenant owners can update own tenant') THEN
    CREATE POLICY "Tenant owners can update own tenant"
    ON public.tenants FOR UPDATE
    TO authenticated
    USING (public.is_tenant_owner(id))
    WITH CHECK (public.is_tenant_owner(id));
  END IF;
END$$;

COMMIT;
