-- Owner color settings per tenant
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS public.owner_color_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_key text NOT NULL,
  label text NOT NULL,
  base_color text NOT NULL,  -- HEX like #2563EB
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, owner_key)
);

ALTER TABLE public.owner_color_settings ENABLE ROW LEVEL SECURITY;

-- Read: any tenant member
DROP POLICY IF EXISTS "Tenant members can read owner_color_settings" ON public.owner_color_settings;
CREATE POLICY "Tenant members can read owner_color_settings"
  ON public.owner_color_settings FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

-- Insert: admin only
DROP POLICY IF EXISTS "Admins can insert owner_color_settings" ON public.owner_color_settings;
CREATE POLICY "Admins can insert owner_color_settings"
  ON public.owner_color_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user());

-- Update: admin only
DROP POLICY IF EXISTS "Admins can update owner_color_settings" ON public.owner_color_settings;
CREATE POLICY "Admins can update owner_color_settings"
  ON public.owner_color_settings FOR UPDATE TO authenticated
  USING (public.is_admin_user());

-- Delete: admin only
DROP POLICY IF EXISTS "Admins can delete owner_color_settings" ON public.owner_color_settings;
CREATE POLICY "Admins can delete owner_color_settings"
  ON public.owner_color_settings FOR DELETE TO authenticated
  USING (public.is_admin_user());
