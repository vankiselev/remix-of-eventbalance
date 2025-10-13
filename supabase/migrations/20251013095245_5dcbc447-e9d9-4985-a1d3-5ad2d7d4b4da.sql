-- Fix RLS for profiles UPDATE: add WITH CHECK so updates don't fail with "new row violates RLS"
BEGIN;

-- Recreate admin update policy with WITH CHECK
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (get_current_user_role() = 'admin'::user_role)
WITH CHECK (get_current_user_role() = 'admin'::user_role);

-- Recreate self-update policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

COMMIT;