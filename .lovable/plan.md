
# Исправление истории изменений профиля

## Проблема

**Записи в историю создаются, но не отображаются.** 

Причина: RLS-политика для SELECT в таблице `profile_edit_history` проверяет устаревшее поле `profiles.role = 'admin'`, но у вас админ-роль назначена через RBAC-систему (`user_role_assignments`).

Текущая политика (файл `migrations/20250819092929_...`):
```sql
CREATE POLICY "Admins can view all edit history"
ON public.profile_edit_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'  -- Не работает!
  )
);
```

В вашем профиле `role = 'employee'`, хотя вы администратор через RBAC.

## Решение

Создать новую миграцию, которая:

1. Удалит устаревшую политику SELECT
2. Создаст новую политику, использующую `is_admin_user()` (уже существующую функцию, которая корректно проверяет RBAC)

## Новая миграция

**Файл:** `migrations/20260128_fix_profile_edit_history_rls.sql`

```sql
-- Исправление RLS-политики для profile_edit_history
-- Старая политика проверяет profiles.role = 'admin', но роли теперь через RBAC

-- 1. Удаляем старую политику
DROP POLICY IF EXISTS "Admins can view all edit history" ON public.profile_edit_history;

-- 2. Создаём новую политику, использующую RBAC-проверку
CREATE POLICY "Admins can view all edit history"
ON public.profile_edit_history
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
);

-- Политика INSERT остаётся (WITH CHECK (true)) — записи создаются через SECURITY DEFINER функцию
```

## Как это работает

Функция `is_admin_user()` уже существует (миграция `20251021153828_...`) и корректно проверяет:

1. RBAC: есть ли у пользователя роль с `is_admin_role = true` в `user_role_assignments`
2. Старая система: `user_roles` с ролью `admin`/`super_admin`
3. Fallback: `profiles.role = 'admin'`

После применения миграции история изменений станет видна.

## Файлы для создания

| Файл | Действие |
|------|----------|
| `migrations/20260128_fix_profile_edit_history_rls.sql` | Создать |

## Дополнительно

Также добавлю лог в консоль при ошибках выборки истории, чтобы в будущем было проще отлаживать RLS-проблемы.

---

**Технические детали:**

- Миграция применится автоматически через GitHub Actions
- Записи, которые уже были созданы (`log_profile_edit` вызывался), станут видны после исправления политики
- Никаких изменений в коде фронтенда не требуется
