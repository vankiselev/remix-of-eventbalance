-- Phase 0: Add is_super_admin column to profiles BEFORE tenants table
-- This must run before tenants table creation because RLS policies depend on it

BEGIN;

-- Add is_super_admin to profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create index for super admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(id) WHERE is_super_admin = true;

-- Create helper function that will be used in tenants RLS policy
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

COMMIT;
