-- Создание тестового пользователя test2@example.com с паролем P@ssw0rd
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test2@example.com',
  crypt('P@ssw0rd', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Test User 2"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;
