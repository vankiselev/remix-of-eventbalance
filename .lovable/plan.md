

## Проблема

Миграция `20260320_seed_role_definitions.sql` падает на self-hosted сервере с ошибкой:
```
ERROR: column "display_name" of relation "role_definitions" does not exist
```

Таблица `role_definitions` на self-hosted базе не содержит колонку `display_name`, в то время как в Lovable Cloud эта колонка есть.

## Решение

Обновить миграцию, чтобы она сначала добавляла недостающие колонки (если их нет), а потом вставляла данные. Это сделает миграцию совместимой с обеими базами.

## Изменения

### 1. Обновить `migrations/20260320_seed_role_definitions.sql`

Добавить перед INSERT'ами:
```sql
-- Ensure required columns exist (for self-hosted compatibility)
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS is_admin_role boolean DEFAULT false;
```

Полный файл:
```sql
-- Ensure required columns exist (for self-hosted compatibility)
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS is_admin_role boolean DEFAULT false;

-- Seed role_definitions with standard roles
INSERT INTO role_definitions (name, display_name, code, is_admin_role)
VALUES 
  ('admin', 'Администратор', 'admin', true),
  ('super_admin', 'Супер-администратор', 'super_admin', true),
  ('member', 'Сотрудник', 'member', false)
ON CONFLICT DO NOTHING;

-- Assign admin role to all tenant owners
INSERT INTO user_role_assignments (user_id, role_id)
SELECT tm.user_id, rd.id
FROM tenant_memberships tm
JOIN role_definitions rd ON rd.name = 'admin'
WHERE tm.role = 'owner'
ON CONFLICT DO NOTHING;
```

Это единственное изменение — добавить 3 строки `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` в начало файла.

