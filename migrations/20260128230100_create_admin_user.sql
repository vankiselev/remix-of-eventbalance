-- Create admin user admin@test.com with password 'admin123'

SET ROLE supabase_auth_admin;
SET search_path TO auth, extensions, public;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT u.id INTO uid
  FROM auth.users u
  WHERE u.email = 'admin@test.com'
    AND COALESCE(u.is_sso_user, false) = false
  LIMIT 1;

  IF uid IS NULL THEN
    uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token, email_change, email_change_token_new,
      recovery_token, is_sso_user
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'admin@test.com',
      extensions.crypt('admin123', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Admin User"}'::jsonb,
      'authenticated', 'authenticated',
      '', '', '', '', false
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('admin123', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = uid;
  END IF;

  -- Ensure identity exists
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  VALUES (uid, uid, jsonb_build_object('sub', uid::text, 'email', 'admin@test.com', 'email_verified', true),
          'email', uid::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name, first_name)
  VALUES (uid, 'admin@test.com', 'Admin User', 'Admin')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Assign admin role via user_role_assignments
  INSERT INTO public.user_role_assignments (user_id, role_id)
  SELECT uid, rd.id
  FROM public.role_definitions rd
  WHERE rd.code = 'admin' OR rd.name = 'admin'
  LIMIT 1
  ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;
END $$;

RESET search_path;
RESET ROLE;
