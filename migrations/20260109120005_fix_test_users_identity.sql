-- Добавление identity записей для существующих пользователей test1 и test2
-- Это нужно для работы email-авторизации

-- Для test1@example.com
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT 
  u.id,
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'test1@example.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Для test2@example.com
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT 
  u.id,
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'test2@example.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Обновляем raw_app_meta_data если пустые
UPDATE auth.users 
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE email IN ('test1@example.com', 'test2@example.com')
  AND (raw_app_meta_data IS NULL OR raw_app_meta_data = '{}'::jsonb);
