-- Convert invitations.role from user_role enum to text
-- This allows storing any role code from role_definitions
-- Idempotent: safe to re-run if column is already text

DO $$
BEGIN
  -- Only alter if column is not already text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitations'
      AND column_name = 'role'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN role TYPE text;
  END IF;
END $$;
