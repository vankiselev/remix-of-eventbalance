-- Remove duplicate RLS policy on user_role_assignments
DO $$ BEGIN
  -- Keep only "Users can view their own role assignments", drop the duplicate "Users can view their own role"
  BEGIN
    DROP POLICY IF EXISTS "Users can view their own role" ON public.user_role_assignments;
  EXCEPTION WHEN others THEN 
    RAISE NOTICE 'Policy "Users can view their own role" did not exist or already dropped';
  END;
END $$;