-- Fix: allow users to always read their own profile
-- Self-hosted may not have tenant_id column on profiles

DROP POLICY IF EXISTS "Tenant members can read profiles" ON public.profiles;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Tenant members can read profiles"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (
          id = auth.uid()
          OR tenant_id IS NULL
          OR is_tenant_member(tenant_id)
        )
    $pol$;
  ELSE
    EXECUTE $pol$
      CREATE POLICY "Tenant members can read profiles"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (true)
    $pol$;
  END IF;
END $$;
