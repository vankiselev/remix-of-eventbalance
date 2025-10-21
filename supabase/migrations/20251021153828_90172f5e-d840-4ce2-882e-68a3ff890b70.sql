-- Update is_admin_user to check is_admin_role flag
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- New RBAC system: any role with is_admin_role = true
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.is_admin_role = true
    )
    OR
    -- Old system (user_roles table)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('admin'::app_role, 'super_admin'::app_role)
        AND ur.revoked_at IS NULL
    )
    OR
    -- Legacy fallback: profiles.role = 'admin'
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.role = 'admin'::user_role
    )
  , false);
$function$;