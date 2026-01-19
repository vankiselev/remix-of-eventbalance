-- Add critical unique indexes for auth schema
-- These indexes are required for ON CONFLICT clauses in user creation migrations
-- The auth schema is created by Supabase Auth service, but indexes might be missing

-- Switch to auth admin role to modify auth schema
SET ROLE supabase_auth_admin;

-- Partial unique index on email for non-SSO users
-- This allows multiple SSO users with the same email (from different providers)
-- but enforces uniqueness for regular email/password users
CREATE UNIQUE INDEX IF NOT EXISTS users_email_partial_key
  ON auth.users (email)
  WHERE (is_sso_user = false);

-- Ensure the is_sso_user column exists (it should from Auth service)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'is_sso_user'
  ) THEN
    RAISE EXCEPTION 'Column auth.users.is_sso_user does not exist. Auth schema may be incomplete.';
  END IF;
END $$;

-- Unique index on identities (provider, provider_id)
-- This ensures a user can only have one identity per provider
CREATE UNIQUE INDEX IF NOT EXISTS identities_provider_id_provider_unique
  ON auth.identities (provider, provider_id);

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Auth unique indexes verified/created successfully';
END $$;

-- Reset to original role
RESET ROLE;
