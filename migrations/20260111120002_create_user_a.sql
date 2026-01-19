-- Switch to auth admin role to modify auth schema
SET ROLE supabase_auth_admin;

-- Add extensions schema to search_path for pgcrypto functions
SET search_path TO auth, extensions, public;

-- Создаём пользователя a@ab.com
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
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'a@ab.com',
  extensions.crypt('P@ssw0rd', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "User A"}'::jsonb,
  'authenticated',
  'authenticated'
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
WHERE u.email = 'a@ab.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Reset to original settings
RESET search_path;
RESET ROLE;
