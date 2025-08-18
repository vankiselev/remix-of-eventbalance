-- Fix security issue: Restrict salary information access to admins only
-- Drop the current employee self-view policy
DROP POLICY IF EXISTS "Employees can view only their own record" ON public.employees;

-- Create a new policy that allows employees to view their own records EXCEPT salary
CREATE POLICY "Employees can view their own record (excluding salary)" 
ON public.employees 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND current_setting('request.columns', true) NOT LIKE '%salary%'
);

-- Create a separate policy for admins to view salary information
-- (The existing admin policy already covers this, but let's be explicit)
CREATE POLICY "Only admins can view salary information" 
ON public.employees 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'admin'::user_role 
  AND current_setting('request.columns', true) LIKE '%salary%'
);

-- Alternative approach: Create a view for employee self-service that excludes salary
CREATE OR REPLACE VIEW public.employee_profile AS
SELECT 
  id,
  user_id,
  position,
  hire_date,
  created_at,
  updated_at
FROM public.employees;

-- Grant access to the view
GRANT SELECT ON public.employee_profile TO authenticated;

-- Create RLS policy for the view
ALTER VIEW public.employee_profile SET (security_barrier = true);
CREATE POLICY "Employees can view their own profile" 
ON public.employee_profile 
FOR SELECT 
USING (auth.uid() = user_id);