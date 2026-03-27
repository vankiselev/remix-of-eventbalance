-- =====================================================
-- Create permissions & role_permissions tables,
-- add 'supervisor' role with specified permissions
-- Idempotent: safe to re-run
-- =====================================================

-- 1. Create permissions table if not exists
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  scope_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

-- 2. Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- 3. Seed all permission codes used in the app
INSERT INTO public.permissions (code, category, name) VALUES
  -- Finances
  ('finances.view_all', 'finances', 'Просмотр всех финансов'),
  ('finances.import', 'finances', 'Импорт финансов'),
  ('finances.export', 'finances', 'Экспорт финансов'),
  ('finances.delete_all', 'finances', 'Удаление всех транзакций'),
  ('finances.edit_all', 'finances', 'Редактирование всех транзакций'),
  -- Transactions
  ('transactions.review', 'transactions', 'Проверка транзакций'),
  ('transactions.approve', 'transactions', 'Одобрение транзакций'),
  ('transactions.reject', 'transactions', 'Отклонение транзакций'),
  ('transactions.view_all', 'transactions', 'Просмотр всех транзакций'),
  -- Events
  ('events.view_active', 'events', 'Просмотр активных событий'),
  ('events.create', 'events', 'Создание событий'),
  ('events.edit_all', 'events', 'Редактирование всех событий'),
  -- Staff
  ('staff.view_basic', 'staff', 'Просмотр базовой информации'),
  ('staff.edit_own', 'staff', 'Редактирование своего профиля'),
  ('staff.view_all', 'staff', 'Просмотр всех сотрудников'),
  ('staff.edit_all', 'staff', 'Редактирование всех сотрудников'),
  ('staff.manage', 'staff', 'Управление сотрудниками'),
  -- Contacts
  ('contacts.view', 'contacts', 'Просмотр контактов'),
  ('contacts.create', 'contacts', 'Создание контактов'),
  ('contacts.edit', 'contacts', 'Редактирование контактов'),
  ('contacts.delete', 'contacts', 'Удаление контактов'),
  -- Vacations
  ('vacations.view_own', 'vacations', 'Просмотр своих отпусков'),
  ('vacations.create', 'vacations', 'Создание отпусков'),
  ('vacations.edit_own', 'vacations', 'Редактирование своих отпусков'),
  ('vacations.approve', 'vacations', 'Одобрение отпусков'),
  ('vacations.view_all', 'vacations', 'Просмотр всех отпусков'),
  -- Reports
  ('reports.view_all', 'reports', 'Просмотр всех отчётов'),
  ('reports.edit_all', 'reports', 'Редактирование всех отчётов'),
  -- System
  ('system.manage_roles', 'system', 'Управление ролями'),
  ('system.invite_users', 'system', 'Приглашение пользователей'),
  ('system.view_audit', 'system', 'Просмотр журнала аудита'),
  -- Warehouse
  ('warehouse.view', 'warehouse', 'Просмотр склада'),
  ('warehouse.manage', 'warehouse', 'Управление складом')
ON CONFLICT (code) DO NOTHING;

-- 4. Upsert supervisor role
INSERT INTO public.role_definitions (name, display_name, code, is_admin_role)
VALUES ('supervisor', 'Руководитель', 'supervisor', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  code = EXCLUDED.code,
  is_admin_role = EXCLUDED.is_admin_role;

-- 5. Assign permissions to supervisor
DO $$
DECLARE
  v_role_id uuid;
  v_perm_codes text[] := ARRAY[
    'finances.view_all',
    'events.view_active',
    'events.create',
    'events.edit_all',
    'staff.view_basic',
    'staff.edit_own',
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'vacations.view_own',
    'vacations.create',
    'vacations.edit_own',
    'reports.view_all'
  ];
  v_perm_id uuid;
  v_code text;
BEGIN
  SELECT id INTO v_role_id FROM public.role_definitions WHERE name = 'supervisor';
  
  FOREACH v_code IN ARRAY v_perm_codes LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE code = v_code;
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id, granted)
      VALUES (v_role_id, v_perm_id, true)
      ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
    END IF;
  END LOOP;
END $$;
