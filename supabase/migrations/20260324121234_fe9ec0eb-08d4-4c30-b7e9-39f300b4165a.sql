
-- Fix: allow users to always read their own profile (prevents "account deleted" false positive)
DROP POLICY IF EXISTS "Tenant members can read profiles" ON public.profiles;
CREATE POLICY "Tenant members can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR tenant_id IS NULL
    OR is_tenant_member(tenant_id)
  );
