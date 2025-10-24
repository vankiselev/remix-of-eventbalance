-- Fix policies on user_role_assignments (using correct pg_policies columns)
DO $$
BEGIN
  -- Enable RLS (no-op if already enabled)
  BEGIN
    EXECUTE 'ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN others THEN NULL; END;

  -- Drop existing conflicting policies if present
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_role_assignments' AND policyname = 'Users can view their own role assignments'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own role assignments" ON public.user_role_assignments';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_role_assignments' AND policyname = 'Admins can view all role assignments'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view all role assignments" ON public.user_role_assignments';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_role_assignments' AND policyname = 'Admins can manage role assignments'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage role assignments" ON public.user_role_assignments';
  END IF;
END$$;

-- Users can view their own assignments
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all assignments
CREATE POLICY "Admins can view all role assignments"
ON public.user_role_assignments
FOR SELECT
USING (public.is_admin_user(auth.uid()));

-- Admins can manage assignments (insert/update/delete)
CREATE POLICY "Admins can manage role assignments"
ON public.user_role_assignments
FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));