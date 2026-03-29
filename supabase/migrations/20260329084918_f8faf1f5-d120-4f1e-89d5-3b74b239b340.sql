CREATE TABLE IF NOT EXISTS public.wallet_name_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wallet_key text NOT NULL,
  display_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, wallet_key)
);

ALTER TABLE public.wallet_name_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read wallet_name_settings"
  ON public.wallet_name_settings FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Admins can insert wallet_name_settings"
  ON public.wallet_name_settings FOR INSERT TO authenticated
  WITH CHECK (is_tenant_member(tenant_id) AND is_admin_user());

CREATE POLICY "Admins can update wallet_name_settings"
  ON public.wallet_name_settings FOR UPDATE TO authenticated
  USING (is_tenant_member(tenant_id) AND is_admin_user());

CREATE POLICY "Admins can delete wallet_name_settings"
  ON public.wallet_name_settings FOR DELETE TO authenticated
  USING (is_tenant_member(tenant_id) AND is_admin_user());