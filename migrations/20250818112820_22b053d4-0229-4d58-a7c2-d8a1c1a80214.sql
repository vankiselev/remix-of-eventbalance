-- Fix critical security issue: Employee salary information accessible to all staff
-- Properly remove existing policies and create restrictive ones

-- Drop ALL existing policies on employees table (with correct names from DB)
DROP POLICY IF EXISTS "Admins can manage employee records" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all salaries" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own salary" ON public.employees;
DROP POLICY IF EXISTS "Admins have full access to employee records" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own complete record" ON public.employees;

-- Create comprehensive admin policy for all operations
CREATE POLICY "Admins have full access to employee records"
ON public.employees
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create restricted employee policy - they can only view their own complete record
CREATE POLICY "Employees can view only their own record"
ON public.employees
FOR SELECT
USING (auth.uid() = user_id);

-- Note: Regular employees can now ONLY see their own salary and employment details
-- No employee can see other employees' salary information