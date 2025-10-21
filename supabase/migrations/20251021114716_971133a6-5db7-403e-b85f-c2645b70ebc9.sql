-- Обновляем функцию has_role чтобы поддерживать новую систему ролей
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- 1) Старая система ролей (user_roles)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
        AND ur.revoked_at IS NULL
    )
    OR
    -- 2) Новая система ролей (user_role_assignments + role_definitions)
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.code = (_role::text)
    ), false);
$$;