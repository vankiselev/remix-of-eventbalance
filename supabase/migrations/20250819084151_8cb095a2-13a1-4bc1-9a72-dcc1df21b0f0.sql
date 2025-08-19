-- Fix security issues: Remove SECURITY DEFINER view and simplify approach

-- Drop the problematic view with SECURITY DEFINER
DROP VIEW IF EXISTS public.employee_profiles;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS public.can_view_employee_salary(uuid);

-- The existing policies are already secure:
-- 1. "Employees can view own basic profile" - allows employees to see their own data but salary access is controlled through application logic
-- 2. "Admins can view all employee data including salary" - allows full access for admins

-- Add a comment to document the security approach
COMMENT ON TABLE public.employees IS 'Employee data table. Salary field should only be accessed by admin users through application-level security controls.';

-- The current RLS policies are sufficient:
-- - Employees can only see their own records
-- - Admins can see all records
-- - Application layer will control which fields to show to different user types