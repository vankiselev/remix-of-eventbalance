-- =====================================================
-- RBAC System Migration
-- Создание системы управления ролями и правами
-- =====================================================

-- 1. Создание таблицы определений ролей
CREATE TABLE IF NOT EXISTS public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_admin_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Создание таблицы прав доступа
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scope_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Создание таблицы связи ролей и прав
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT false,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- 4. Создание таблицы назначения ролей пользователям
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role_definitions(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Создание таблицы истории изменений прав
CREATE TABLE IF NOT EXISTS public.role_permissions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role_definitions(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Создание таблицы миграций прав
CREATE TABLE IF NOT EXISTS public.permission_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions_added TEXT[],
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id)
);

-- 7. Включение RLS на всех новых таблицах
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_migrations ENABLE ROW LEVEL SECURITY;

-- 8. Создание триггеров для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_definitions_updated_at
  BEFORE UPDATE ON role_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Наполнение системными ролями (admin и employee)
INSERT INTO public.role_definitions (name, code, description, is_system, is_admin_role)
VALUES 
  ('Администратор', 'admin', 'Полный доступ к системе с автоматическим получением всех новых прав', true, true),
  ('Сотрудник', 'employee', 'Базовый доступ для сотрудников организации', true, false)
ON CONFLICT (code) DO NOTHING;

-- 10. Создание базовых прав доступа
INSERT INTO public.permissions (code, category, name, description, scope_type) VALUES
  -- Финансы
  ('finances.view_all', 'finances', 'Просмотр всех транзакций', 'Доступ к просмотру финансовых транзакций всех пользователей', 'all'),
  ('finances.view_own', 'finances', 'Просмотр своих транзакций', 'Доступ только к своим финансовым транзакциям', 'own'),
  ('finances.create', 'finances', 'Создание транзакций', 'Возможность создавать финансовые транзакции', null),
  ('finances.edit_all', 'finances', 'Редактирование всех транзакций', 'Редактирование любых финансовых транзакций', 'all'),
  ('finances.edit_own', 'finances', 'Редактирование своих транзакций', 'Редактирование только своих транзакций', 'own'),
  ('finances.delete_all', 'finances', 'Удаление всех транзакций', 'Удаление любых финансовых транзакций', 'all'),
  ('finances.delete_own', 'finances', 'Удаление своих транзакций', 'Удаление только своих транзакций', 'own'),
  ('finances.export', 'finances', 'Экспорт данных', 'Экспорт финансовых данных', null),
  ('finances.import', 'finances', 'Импорт данных', 'Импорт финансовых данных', null),
  
  -- События
  ('events.view_all', 'events', 'Просмотр всех событий', 'Доступ ко всем событиям в системе', 'all'),
  ('events.view_active', 'events', 'Просмотр активных событий', 'Доступ только к активным событиям', null),
  ('events.create', 'events', 'Создание событий', 'Возможность создавать новые события', null),
  ('events.edit_all', 'events', 'Редактирование всех событий', 'Редактирование любых событий', 'all'),
  ('events.edit_own', 'events', 'Редактирование своих событий', 'Редактирование только своих событий', 'own'),
  ('events.delete_all', 'events', 'Удаление всех событий', 'Удаление любых событий', 'all'),
  ('events.delete_own', 'events', 'Удаление своих событий', 'Удаление только своих событий', 'own'),
  ('events.archive', 'events', 'Архивирование событий', 'Возможность архивировать события', null),
  
  -- Сотрудники
  ('staff.view_all', 'staff', 'Просмотр всех сотрудников', 'Полная информация о всех сотрудниках', 'all'),
  ('staff.view_basic', 'staff', 'Базовая информация о сотрудниках', 'Просмотр базовой информации без зарплат', null),
  ('staff.view_salary', 'staff', 'Просмотр зарплат', 'Доступ к информации о зарплатах', null),
  ('staff.edit_all', 'staff', 'Редактирование профилей', 'Редактирование профилей сотрудников', 'all'),
  ('staff.edit_own', 'staff', 'Редактирование своего профиля', 'Редактирование только своего профиля', 'own'),
  ('staff.manage', 'staff', 'Управление сотрудниками', 'Найм и увольнение сотрудников', null),
  
  -- Контакты
  ('contacts.view', 'contacts', 'Просмотр контактов', 'Доступ к контактам (клиенты, площадки, подрядчики)', null),
  ('contacts.create', 'contacts', 'Создание контактов', 'Добавление новых контактов', null),
  ('contacts.edit', 'contacts', 'Редактирование контактов', 'Изменение информации о контактах', null),
  ('contacts.delete', 'contacts', 'Удаление контактов', 'Удаление контактов из системы', null),
  
  -- Отпуска
  ('vacations.view_all', 'vacations', 'Просмотр всех отпусков', 'Доступ ко всем запросам на отпуск', 'all'),
  ('vacations.view_own', 'vacations', 'Просмотр своих отпусков', 'Доступ только к своим отпускам', 'own'),
  ('vacations.create', 'vacations', 'Создание запросов', 'Создание запросов на отпуск', null),
  ('vacations.edit_own', 'vacations', 'Редактирование своих запросов', 'Изменение своих запросов на отпуск', 'own'),
  ('vacations.approve', 'vacations', 'Одобрение отпусков', 'Одобрение/отклонение запросов на отпуск', null),
  
  -- Отчеты
  ('reports.view_own', 'reports', 'Просмотр своих отчетов', 'Доступ к своим отчетам', 'own'),
  ('reports.view_all', 'reports', 'Просмотр всех отчетов', 'Доступ ко всем отчетам', 'all'),
  ('reports.create', 'reports', 'Создание отчетов', 'Создание новых отчетов', null),
  ('reports.edit_own', 'reports', 'Редактирование своих отчетов', 'Изменение своих отчетов', 'own'),
  ('reports.edit_all', 'reports', 'Редактирование всех отчетов', 'Изменение любых отчетов', 'all'),
  
  -- Система
  ('system.manage_roles', 'system', 'Управление ролями', 'Создание и настройка ролей и прав', null),
  ('system.invite_users', 'system', 'Приглашение пользователей', 'Отправка приглашений новым пользователям', null),
  ('system.view_audit', 'system', 'Просмотр логов', 'Доступ к логам аудита системы', null)
ON CONFLICT (code) DO NOTHING;

-- 11. Назначение всех прав администратору
INSERT INTO public.role_permissions (role_id, permission_id, granted, scope)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'admin'),
  p.id,
  true,
  COALESCE(p.scope_type, 'all')
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 12. Назначение ограниченных прав сотруднику
INSERT INTO public.role_permissions (role_id, permission_id, granted, scope)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'employee'),
  p.id,
  true,
  COALESCE(p.scope_type, 'own')
FROM permissions p
WHERE p.code IN (
  'finances.view_own',
  'finances.create',
  'finances.edit_own',
  'finances.delete_own',
  'events.view_active',
  'events.create',
  'events.edit_own',
  'staff.view_basic',
  'staff.edit_own',
  'vacations.view_own',
  'vacations.create',
  'vacations.edit_own',
  'reports.view_own',
  'reports.create',
  'reports.edit_own'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 13. Миграция пользователей из user_roles в user_role_assignments
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, assigned_at)
SELECT 
  ur.user_id,
  CASE 
    WHEN ur.role IN ('super_admin', 'admin') THEN (SELECT id FROM role_definitions WHERE code = 'admin')
    ELSE (SELECT id FROM role_definitions WHERE code = 'employee')
  END,
  ur.assigned_by,
  ur.assigned_at
FROM user_roles ur
WHERE ur.revoked_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 14. RLS политики для role_definitions
CREATE POLICY "Admins can view all roles"
  ON role_definitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

CREATE POLICY "Admins can manage roles"
  ON role_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

-- 15. RLS политики для permissions
CREATE POLICY "Admins can view all permissions"
  ON permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

-- 16. RLS политики для role_permissions
CREATE POLICY "Admins can view all role permissions"
  ON role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

-- 17. RLS политики для user_role_assignments
CREATE POLICY "Users can view their own role"
  ON user_role_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments"
  ON user_role_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

CREATE POLICY "Admins can manage role assignments"
  ON user_role_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

-- 18. RLS политики для истории
CREATE POLICY "Admins can view role permissions history"
  ON role_permissions_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

CREATE POLICY "System can insert history"
  ON role_permissions_history FOR INSERT
  WITH CHECK (true);

-- 19. RLS политики для миграций
CREATE POLICY "Admins can view migrations"
  ON permission_migrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN role_definitions rd ON ura.role_id = rd.id
      WHERE ura.user_id = auth.uid() AND rd.code = 'admin'
    )
  );

-- 20. Создание записи о миграции
INSERT INTO permission_migrations (version, description, permissions_added)
VALUES (
  '2025.01.001',
  'Инициализация системы RBAC с базовыми ролями и правами',
  ARRAY['finances.view_all', 'finances.view_own', 'finances.create', 'finances.edit_all', 
        'finances.edit_own', 'finances.delete_all', 'finances.delete_own', 'finances.export', 
        'finances.import', 'events.view_all', 'events.view_active', 'events.create', 
        'events.edit_all', 'events.edit_own', 'events.delete_all', 'events.delete_own', 
        'events.archive', 'staff.view_all', 'staff.view_basic', 'staff.view_salary', 
        'staff.edit_all', 'staff.edit_own', 'staff.manage', 'contacts.view', 'contacts.create', 
        'contacts.edit', 'contacts.delete', 'vacations.view_all', 'vacations.view_own', 
        'vacations.create', 'vacations.edit_own', 'vacations.approve', 'reports.view_own', 
        'reports.view_all', 'reports.create', 'reports.edit_own', 'reports.edit_all', 
        'system.manage_roles', 'system.invite_users', 'system.view_audit']
);