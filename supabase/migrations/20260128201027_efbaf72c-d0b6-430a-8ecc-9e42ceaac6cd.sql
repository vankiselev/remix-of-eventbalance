-- Создаём пользователя a@a.com в Lovable Cloud (без ON CONFLICT)
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Проверяем, не существует ли уже пользователь
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'a@a.com') THEN
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
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'a@a.com',
      crypt('password', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Admin User"}'::jsonb,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );
    
    -- Создаём identity
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (
      new_user_id,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'a@a.com', 'email_verified', true),
      'email',
      new_user_id::text,
      now(),
      now(),
      now()
    );
    
    -- Создаём профиль
    INSERT INTO public.profiles (id, email, full_name, first_name)
    VALUES (new_user_id, 'a@a.com', 'Admin User', 'Admin');
    
    -- Назначаем роль админа
    INSERT INTO public.user_role_assignments (user_id, role_id)
    SELECT new_user_id, rd.id
    FROM public.role_definitions rd
    WHERE rd.name = 'admin';
  END IF;
END $$;