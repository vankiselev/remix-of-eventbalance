-- Создание тестового пользователя test@example.com с паролем P@ssw0rd
-- Use DO block to check if user exists before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com') THEN
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
      role,
      is_sso_user
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'test@example.com',
      crypt('P@ssw0rd', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"full_name": "Test User"}'::jsonb,
      'authenticated',
      'authenticated',
      false
    );
  END IF;
END $$;
