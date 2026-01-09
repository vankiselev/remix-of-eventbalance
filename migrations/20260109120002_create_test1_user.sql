-- Создание тестового пользователя test1@example.com с паролем P@ssw0rd
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_meta_data,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'test1@example.com',
    crypt('P@ssw0rd', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Test User 1"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    'authenticated',
    'authenticated'
  ) ON CONFLICT ON CONSTRAINT users_email_partial_key DO NOTHING;

  -- Создаём identity для email-авторизации
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    'test1@example.com',
    'email',
    jsonb_build_object('sub', new_user_id::text, 'email', 'test1@example.com', 'email_verified', true),
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;
END $$;
