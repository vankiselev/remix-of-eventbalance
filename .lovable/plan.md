

## Исправление двух падающих миграций

### Причины ошибок

1. **`20260320_expand_tenants_table.sql`** — ссылается на `public.is_admin_user()`, которая на self-hosted ещё не создана на момент выполнения этой миграции
2. **`20260320_fix_expand_tenants_prereq.sql`** — функция `is_tenant_owner` использует `AND role = 'owner'`, но в таблице `tenant_memberships` колонка называется `is_owner` (boolean), а не `role` (text)

Подтверждение: оригинальная миграция `20260128140002_create_tenant_memberships.sql` создаёт таблицу с `is_owner boolean DEFAULT false`, без колонки `role`.

### Решение

**Файл 1: `migrations/20260320_expand_tenants_table.sql`**
- Добавить создание `is_admin_user()` в начало миграции (перед использованием в политике)
- Исправить `is_tenant_owner()`: заменить `AND role = 'owner'` на `AND is_owner = true`

**Файл 2: `migrations/20260320_fix_expand_tenants_prereq.sql`**  
- Удалить файл — он больше не нужен, т.к. всё будет исправлено в основной миграции

### Итоговая структура `20260320_expand_tenants_table.sql`

```sql
BEGIN;

-- 1) Create is_admin_user() if missing
CREATE OR REPLACE FUNCTION public.is_admin_user() ...

-- 2) Add columns (idempotent DO block — без изменений)

-- 3) Create "Super admins can update tenants" policy (без изменений)

-- 4) Fix is_tenant_owner: is_owner = true вместо role = 'owner'
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id uuid) ...
  WHERE ... AND is_owner = true

-- 5) Create "Tenant owners can update own tenant" policy (без изменений)

COMMIT;
```

### Файлы

| Файл | Действие |
|---|---|
| `migrations/20260320_expand_tenants_table.sql` | Исправить — добавить `is_admin_user()`, заменить `role = 'owner'` на `is_owner = true` |
| `migrations/20260320_fix_expand_tenants_prereq.sql` | Удалить — дублирует исправленную миграцию |

