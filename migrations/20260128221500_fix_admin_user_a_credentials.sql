-- Ensure admin user a@a.com exists in *self-hosted* auth schema and has the expected password.
-- This is meant for your own DB only (not Lovable Cloud).

-- Switch to auth admin role to modify auth schema
SET ROLE supabase_auth_admin;

-- Add extensions schema to search_path for pgcrypto functions
SET search_path TO auth, extensions, public;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT u.id
  INTO uid
  FROM auth.users u
  WHERE u.email = 'a@a.com'
    AND COALESCE(u.is_sso_user, false) = false
  LIMIT 1;

  IF uid IS NULL THEN
    uid := gen_random_uuid();

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
      recovery_token,
      is_sso_user
    )
    VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'a@a.com',
      extensions.crypt('password', extensions.gen_salt('bf')),
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
      '',
      false
    );
  ELSE
    -- If user already exists, force-update password + required GoTrue token fields
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt('password', extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now(),
      confirmation_token = COALESCE(confirmation_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token = COALESCE(recovery_token, '')
    WHERE id = uid;
  END IF;

  -- Ensure identity exists for email provider
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    uid,
    uid,
    jsonb_build_object('sub', uid::text, 'email', 'a@a.com', 'email_verified', true),
    'email',
    uid::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name, first_name)
  VALUES (uid, 'a@a.com', 'Admin User', 'Admin')
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name;

  -- Ensure admin RBAC assignment exists
  INSERT INTO public.user_role_assignments (user_id, role_id)
  SELECT uid, rd.id
  FROM public.role_definitions rd
  WHERE rd.name = 'admin'
  ON CONFLICT (user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id;
END $$;

-- Reset to original settings
RESET search_path;
RESET ROLE;
