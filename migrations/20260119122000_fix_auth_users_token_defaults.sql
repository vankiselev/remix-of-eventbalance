-- Fix for GoTrue 500 "Database error querying schema" caused by NULL token fields in auth.users
-- See: https://github.com/supabase/auth/issues/1940

SET ROLE supabase_auth_admin;
SET search_path TO auth, extensions, public;

-- Ensure defaults (prevents future SQL-created users from breaking auth)
ALTER TABLE auth.users ALTER COLUMN confirmation_token SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN email_change SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN email_change_token_new SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN recovery_token SET DEFAULT '';

-- Backfill existing rows that have NULLs
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, '')
WHERE
  confirmation_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL
  OR recovery_token IS NULL;

RESET search_path;
RESET ROLE;
