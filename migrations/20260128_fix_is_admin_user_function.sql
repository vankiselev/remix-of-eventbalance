-- Исправление функции is_admin_user после удаления user_roles таблицы
-- Убираем ссылку на несуществующую таблицу user_roles

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- RBAC system: any role with is_admin_role = true
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.is_admin_role = true
    )
    OR
    -- Legacy fallback: profiles.role = 'admin'
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.role = 'admin'::user_role
    )
  , false);
$function$;
