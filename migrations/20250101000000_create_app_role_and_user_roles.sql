-- =====================================================
-- Create app_role enum type
-- This is a prerequisite for the RBAC system
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'super_admin',
      'admin',
      'employee',
      'contractor',
      'animator'
    );
  END IF;
END
$$;
