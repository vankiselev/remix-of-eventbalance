

## План: Назначение роли admin для ikiselev@me.com

### Создать миграцию

**Файл:** `migrations/20260127120000_add_admin_role_ikiselev.sql`

```sql
-- Назначение роли admin для ikiselev@me.com через RBAC систему
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
SELECT
  u.id,
  rd.id,
  u.id
FROM auth.users u
JOIN public.role_definitions rd ON rd.code = 'admin'
WHERE u.email = 'ikiselev@me.com'
ON CONFLICT (user_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  assigned_by = EXCLUDED.assigned_by,
  assigned_at = now();
```

### Что делает миграция:
1. Находит пользователя по email `ikiselev@me.com` в `auth.users`
2. Находит роль `admin` в `role_definitions`
3. Создаёт запись в `user_role_assignments`
4. Если запись уже есть — обновляет роль на admin

### После применения:
- GitHub Actions применит миграцию автоматически
- Пользователь получит доступ к админ-панели
- Функция `has_role()` и `is_admin_user()` будут возвращать `true`

