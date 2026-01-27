

## План: Создание пользователя ikiselev@me.com с полной авторизацией

### Проблема
После переноса базы данных пользователь `ikiselev@me.com` не может войти, потому что:
- Supabase GoTrue возвращает `invalid_credentials`
- Пользователь либо не существует в `auth.users`, либо отсутствует запись в `auth.identities`

### Решение
Создать миграцию, которая:
1. Создаст пользователя в `auth.users` с паролем `Kiselyovi116`
2. Создаст запись в `auth.identities` для email-авторизации
3. Назначит роль admin через `user_role_assignments`

### Файл миграции

**`migrations/20260127130000_create_admin_user_ikiselev.sql`**

```sql
-- Switch to auth admin role to modify auth schema
SET ROLE supabase_auth_admin;

-- Add extensions schema to search_path for pgcrypto functions
SET search_path TO auth, extensions, public;

-- Создаём пользователя ikiselev@me.com
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ikiselev@me.com',
  extensions.crypt('Kiselyovi116', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Igor Kiselev"}'::jsonb,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) WHERE (is_sso_user = false) DO NOTHING;

-- Создаём identity для email-авторизации
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
SELECT 
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'ikiselev@me.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Reset to original settings
RESET search_path;
RESET ROLE;

-- Назначаем роль admin
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

### Что делает миграция

| Шаг | Действие |
|-----|----------|
| 1 | Создаёт пользователя в `auth.users` с захешированным паролем |
| 2 | Подтверждает email сразу (`email_confirmed_at = now()`) |
| 3 | Создаёт `auth.identities` для входа по email/паролю |
| 4 | Назначает роль `admin` в RBAC системе |

### После применения
- GitHub Actions применит миграцию автоматически
- Пользователь сможет войти с email `ikiselev@me.com` и паролем `Kiselyovi116`
- Пользователь получит доступ к админ-панели

### Техническая информация
- Используется `extensions.crypt()` для безопасного хеширования пароля (bcrypt)
- `ON CONFLICT ... DO NOTHING` предотвращает ошибки при повторном запуске
- Миграция предыдущая (`20260127120000_add_admin_role_ikiselev.sql`) будет работать как fallback, если пользователь уже существовал

