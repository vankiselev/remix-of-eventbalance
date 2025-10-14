-- Обновляем RLS политики для работы с обеими системами (старой и новой)
-- Пользователь может быть admin через:
-- 1. Старую систему user_roles (role = 'admin' или 'super_admin')
-- 2. Новую систему user_role_assignments (role_definitions.code = 'admin')

-- Создаем улучшенную функцию проверки админа
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Проверяем старую систему (user_roles)
    has_role(_user_id, 'admin') OR
    has_role(_user_id, 'super_admin') OR
    -- Проверяем новую систему (user_role_assignments)
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = _user_id
        AND rd.code IN ('admin', 'super_admin')
    );
$$;

-- Обновляем политики для role_definitions
DROP POLICY IF EXISTS "Admins can view all roles" ON role_definitions;
DROP POLICY IF EXISTS "Admins can manage roles" ON role_definitions;

CREATE POLICY "Admins can view all roles"
  ON role_definitions FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON role_definitions FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Обновляем политики для permissions
DROP POLICY IF EXISTS "Admins can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;

CREATE POLICY "Admins can view all permissions"
  ON permissions FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Обновляем политики для role_permissions
DROP POLICY IF EXISTS "Admins can view all role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;

CREATE POLICY "Admins can view all role permissions"
  ON role_permissions FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Обновляем политики для user_role_assignments
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments" ON user_role_assignments;

CREATE POLICY "Admins can view all role assignments"
  ON user_role_assignments FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage role assignments"
  ON user_role_assignments FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Обновляем политики для истории
DROP POLICY IF EXISTS "Admins can view role permissions history" ON role_permissions_history;

CREATE POLICY "Admins can view role permissions history"
  ON role_permissions_history FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Обновляем политики для миграций
DROP POLICY IF EXISTS "Admins can view migrations" ON permission_migrations;

CREATE POLICY "Admins can view migrations"
  ON permission_migrations FOR SELECT
  USING (is_admin_user(auth.uid()));