-- Fix has_role and get_current_user_role to work with actual table structure
-- user_role_assignments doesn't have revoked_at column

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- New system (user_role_assignments)
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.code = (_role::text)
    )
    OR
    -- Old system (user_roles)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
        AND ur.revoked_at IS NULL
    )
    OR
    -- Legacy fallback: profiles.role = 'admin'
    (
      _role = 'admin'::app_role AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _user_id AND p.role = 'admin'::user_role
      )
    ), false);
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(
      -- New system: check if user has admin role
      (
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM public.user_role_assignments ura
          JOIN public.role_definitions rd ON rd.id = ura.role_id
          WHERE ura.user_id = auth.uid()
            AND rd.is_admin_role = true
        ) THEN 'admin'::user_role END
      ),
      -- Old system: check user_roles
      (
        SELECT CASE WHEN get_user_highest_role(auth.uid()) IN ('admin'::app_role, 'super_admin'::app_role)
          THEN 'admin'::user_role END
      ),
      -- Legacy fallback: profiles.role
      (
        SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
      ),
      'employee'::user_role
    );
$$;