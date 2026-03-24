-- Fix: allow users to always read their own profile
-- Without this, newly registered users get "account deleted" error
-- because they can't SELECT their own profile when tenant_id is set
-- but membership hasn't propagated yet.

DROP POLICY IF EXISTS "Tenant members can read profiles" ON public.profiles;
CREATE POLICY "Tenant members can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR tenant_id IS NULL
    OR is_tenant_member(tenant_id)
  );
