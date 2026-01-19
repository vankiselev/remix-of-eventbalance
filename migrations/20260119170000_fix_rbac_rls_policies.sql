-- Fix RLS policies for RBAC tables to prevent circular dependency
-- Problem: has_role() function needs to read these tables, but RLS policies require admin check which uses has_role()
-- Solution: Allow all authenticated users to READ these tables (metadata is not secret), restrict writes to admins

-- =====================================================
-- 1. role_definitions - справочник ролей
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all roles" ON role_definitions;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON role_definitions;

CREATE POLICY "Authenticated users can view roles"
  ON role_definitions FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 2. permissions - справочник прав
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. role_permissions - связь ролей и прав
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON role_permissions;

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. user_role_assignments - назначения ролей пользователям
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own role" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Authenticated users can view role assignments" ON user_role_assignments;

CREATE POLICY "Authenticated users can view role assignments"
  ON user_role_assignments FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- Note: INSERT/UPDATE/DELETE policies remain admin-only
-- role_permissions_history remains admin-only for all operations
-- =====================================================
