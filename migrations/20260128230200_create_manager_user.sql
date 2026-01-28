-- Create manager user manager@test.com with password 'manager123'
-- This migration avoids SET ROLE for public schema operations to bypass RLS issues

DO $$
DECLARE
  uid uuid;
BEGIN
  -- Check if user already exists
  SELECT u.id INTO uid
  FROM auth.users u
  WHERE u.email = 'manager@test.com'
    AND COALESCE(u.is_sso_user, false) = false
  LIMIT 1;

  IF uid IS NULL THEN
    uid := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token, email_change, email_change_token_new,
      recovery_token, is_sso_user
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'manager@test.com',
      extensions.crypt('manager123', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Manager User"}'::jsonb,
      'authenticated', 'authenticated',
      '', '', '', '', false
    );
  ELSE
    -- Update password if user exists
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('manager123', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = uid;
  END IF;

  -- Ensure identity exists
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  VALUES (uid, uid, jsonb_build_object('sub', uid::text, 'email', 'manager@test.com', 'email_verified', true),
          'email', uid::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Ensure profile exists (RLS should be disabled by previous migration)
  INSERT INTO public.profiles (id, email, full_name, first_name)
  VALUES (uid, 'manager@test.com', 'Manager User', 'Manager')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Assign employee role (not admin)
  INSERT INTO public.user_role_assignments (user_id, role_id)
  SELECT uid, rd.id
  FROM public.role_definitions rd
  WHERE rd.code = 'employee' OR rd.name = 'employee'
  LIMIT 1
  ON CONFLICT (user_id) DO NOTHING;
END $$;
