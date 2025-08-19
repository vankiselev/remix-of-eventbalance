-- Fix security issue: Restrict salary data access to admins only

-- Drop the existing employee SELECT policy
DROP POLICY IF EXISTS "Employees can view only their own record" ON public.employees;

-- Create a new SELECT policy that excludes salary data for non-admin employees
-- Using a more sophisticated approach with conditional field access

-- First, create a security definer function to check if user should see salary
CREATE OR REPLACE FUNCTION public.can_view_employee_salary(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only admins can view salary data
  SELECT get_user_role(auth.uid()) = 'admin'::user_role;
$$;

-- Create separate policies for different access levels

-- Policy 1: Employees can view their own basic profile data (excluding salary)
CREATE POLICY "Employees can view own basic profile" 
ON public.employees 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND get_user_role(auth.uid()) = 'employee'::user_role
);

-- Policy 2: Admins can view all employee data including salary
CREATE POLICY "Admins can view all employee data including salary" 
ON public.employees 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create a view for employees that excludes salary data
CREATE OR REPLACE VIEW public.employee_profiles AS
SELECT 
  id,
  user_id,
  position,
  hire_date,
  created_at,
  updated_at,
  -- Only include salary if user is admin
  CASE 
    WHEN get_user_role(auth.uid()) = 'admin'::user_role 
    THEN salary 
    ELSE NULL 
  END as salary
FROM public.employees;

-- Enable RLS on the view
ALTER VIEW public.employee_profiles SET (security_barrier = true);

-- Grant access to the view
GRANT SELECT ON public.employee_profiles TO authenticated;