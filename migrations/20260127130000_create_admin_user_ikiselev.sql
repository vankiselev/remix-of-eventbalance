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
