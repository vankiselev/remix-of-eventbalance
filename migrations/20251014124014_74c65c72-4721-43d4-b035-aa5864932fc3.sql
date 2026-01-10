-- Исправление RLS политик для избежания циркулярных зависимостей
-- Создаем has_role функцию если еще не существует
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
        AND ur.revoked_at IS NULL
    ),
    false
  );
$$;

-- 1. Удаляем старые политики для role_definitions
DROP POLICY IF EXISTS "Admins can view all roles" ON role_definitions;
DROP POLICY IF EXISTS "Admins can manage roles" ON role_definitions;

-- 2. Создаем новые политики используя has_role
CREATE POLICY "Admins can view all roles"
  ON role_definitions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON role_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Удаляем старые политики для permissions
DROP POLICY IF EXISTS "Admins can view all permissions" ON permissions;

-- 4. Создаем новые политики для permissions
CREATE POLICY "Admins can view all permissions"
  ON permissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Удаляем старые политики для role_permissions
DROP POLICY IF EXISTS "Admins can view all role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;

-- 6. Создаем новые политики для role_permissions
CREATE POLICY "Admins can view all role permissions"
  ON role_permissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 7. Удаляем старые политики для user_role_assignments
DROP POLICY IF EXISTS "Users can view their own role" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments" ON user_role_assignments;

-- 8. Создаем новые политики для user_role_assignments
CREATE POLICY "Users can view their own role"
  ON user_role_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments"
  ON user_role_assignments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage role assignments"
  ON user_role_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 9. Политики для истории
DROP POLICY IF EXISTS "Admins can view role permissions history" ON role_permissions_history;
DROP POLICY IF EXISTS "System can insert history" ON role_permissions_history;

CREATE POLICY "Admins can view role permissions history"
  ON role_permissions_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert history"
  ON role_permissions_history FOR INSERT
  WITH CHECK (true);

-- 10. Политики для миграций
DROP POLICY IF EXISTS "Admins can view migrations" ON permission_migrations;

CREATE POLICY "Admins can view migrations"
  ON permission_migrations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));