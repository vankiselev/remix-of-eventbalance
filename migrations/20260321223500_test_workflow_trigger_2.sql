-- Second test migration to verify GitHub Actions workflow
-- Date: 2026-03-21
DO $$
BEGIN
  RAISE NOTICE 'Workflow test #2 triggered successfully at %', now();
END $$;
