-- Enable RLS and add safe policies for RBAC tables used by client hooks
-- 1) user_role_assignments: allow users to read their own roles, admins manage all
DO $$ BEGIN
  -- Enable RLS if not already
  BEGIN
    ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN NULL; END;

  -- Drop existing policies if they exist to avoid duplicates
  BEGIN
    DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.user_role_assignments;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Admins can manage role assignments" ON public.user_role_assignments;
  EXCEPTION WHEN others THEN NULL; END;

  -- Create policies
  CREATE POLICY "Users can view their own role assignments"
    ON public.user_role_assignments
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Admins can manage role assignments"
    ON public.user_role_assignments
    FOR ALL
    USING (is_admin_user(auth.uid()))
    WITH CHECK (is_admin_user(auth.uid()));
END $$;

-- 2) role_definitions: allow read for everyone (safe, non-sensitive metadata)
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN NULL; END;

  BEGIN
    DROP POLICY IF EXISTS "Everyone can view role definitions" ON public.role_definitions;
  EXCEPTION WHEN others THEN NULL; END;

  CREATE POLICY "Everyone can view role definitions"
    ON public.role_definitions
    FOR SELECT
    USING (true);
END $$;