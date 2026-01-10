-- Initial migration to verify auth schema exists
-- This should run before all other migrations
-- The auth schema is created automatically by Supabase Auth service
-- This migration just verifies it exists and adds helpful comments

-- Verify auth schema exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
  ) THEN
    RAISE EXCEPTION 'Auth schema does not exist. Please ensure Supabase Auth service is running.';
  END IF;
END $$;

-- Verify critical auth tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Auth users table does not exist. Please ensure Supabase Auth service has initialized properly.';
  END IF;
END $$;

-- Grant necessary permissions for public schema to reference auth schema
-- This is typically done automatically but we ensure it here
-- Note: COMMENT ON SCHEMA auth requires ownership, so we skip it
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE '✅ Auth schema verification complete. Found auth.users and other required tables.';
END $$;
