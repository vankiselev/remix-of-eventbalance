CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (role_id, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);