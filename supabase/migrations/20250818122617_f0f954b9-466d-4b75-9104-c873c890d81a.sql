-- Fix security issue: Restrict salary information access to admins only
-- Drop the current employee self-view policy
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;

-- Create a simple view for employee self-service that excludes salary
CREATE OR REPLACE VIEW public.employee_profile AS
SELECT 
  id,
  user_id,
  position,
  hire_date,
  created_at,
  updated_at
FROM public.employees
WHERE auth.uid() = user_id;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.employee_profile TO authenticated;

-- Update the existing admin policy to ensure it covers salary access
-- (This policy already exists and works, just making sure it's comprehensive)
DROP POLICY IF EXISTS "Admins have full access to employee records" ON public.employees;
CREATE POLICY "Admins have full access to employee records including salary" 
ON public.employees 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);