-- Удаление legacy системы ролей (user_roles таблица)
-- Все роли теперь хранятся в user_role_assignments

-- 1. Обновляем get_user_profile_with_roles - убираем legacy_roles
CREATE OR REPLACE FUNCTION public.get_user_profile_with_roles()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'last_name', p.last_name,
        'first_name', p.first_name,
        'middle_name', p.middle_name,
        'phone', p.phone,
        'birth_date', p.birth_date,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'employment_status', p.employment_status,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      FROM public.profiles p
      WHERE p.id = current_user_id
    ),
    'employee', (
      SELECT json_build_object(
        'id', e.id,
        'position', e.position,
        'hire_date', e.hire_date
      )
      FROM public.employees e
      WHERE e.user_id = current_user_id
    ),
    'rbac_roles', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', rd.name,
          'code', rd.code,
          'is_admin_role', rd.is_admin_role
        )
      ), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = current_user_id
    ),
    'permissions', (
      SELECT COALESCE(json_agg(DISTINCT perm.code), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_permissions rp ON rp.role_id = ura.role_id AND rp.granted = true
      JOIN public.permissions perm ON perm.id = rp.permission_id
      WHERE ura.user_id = current_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. Упрощаем has_role - только RBAC система
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.code = (_role::text)
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

-- 3. Упрощаем get_current_user_role - только RBAC система
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(
      -- RBAC system: check if user has admin role
      (
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM public.user_role_assignments ura
          JOIN public.role_definitions rd ON rd.id = ura.role_id
          WHERE ura.user_id = auth.uid()
            AND rd.is_admin_role = true
        ) THEN 'admin'::user_role END
      ),
      -- Legacy fallback: profiles.role
      (
        SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
      ),
      'employee'::user_role
    );
$$;

-- 4. Удаляем функцию get_user_highest_role (использовала user_roles)
DROP FUNCTION IF EXISTS public.get_user_highest_role(uuid);

-- 5. Удаляем таблицу user_roles
DROP TABLE IF EXISTS public.user_roles CASCADE;
