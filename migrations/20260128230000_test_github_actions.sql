-- Test migration to verify GitHub Actions workflow
-- This is a no-op migration to validate the automated deployment process

-- Verify migrations table exists and is accessible
DO $$
BEGIN
  RAISE NOTICE 'GitHub Actions automated deployment test - migration applied successfully';
END $$;
