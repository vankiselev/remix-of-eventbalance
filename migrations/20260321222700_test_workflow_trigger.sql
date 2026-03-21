-- Test migration to verify GitHub Actions workflow trigger
-- Date: 2026-03-21
DO $$
BEGIN
  RAISE NOTICE 'Workflow test migration triggered successfully at %', now();
END $$;
