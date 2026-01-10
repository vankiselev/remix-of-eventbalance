-- Final security hardening for employees table
-- Create column-level security by creating separate functions for admin and employee access

-- Drop existing employee policies to replace with more secure ones
DROP POLICY IF EXISTS "Employees can view own basic data only" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own basic profile" ON public.employees;

-- Create secure function for employees to get their own basic employment data (no salary)
CREATE OR REPLACE FUNCTION public.get_employee_basic_data()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  "position" text,
  hire_date date,
  phone text,
  birth_date date,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.user_id,
    e.position,
    e.hire_date,
    e.phone,
    e.birth_date,
    e.avatar_url,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE e.user_id = auth.uid();
$$;

-- Create secure function for admins to get all employee data (including salary)
CREATE OR REPLACE FUNCTION public.get_admin_employee_data()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  "position" text,
  hire_date date,
  salary numeric,
  phone text,
  birth_date date,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.user_id,
    e.position,
    e.hire_date,
    e.salary,
    e.phone,
    e.birth_date,
    e.avatar_url,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.role = 'admin'::user_role
  );
$$;

-- Create new restrictive policy - only admins can directly access employees table
CREATE POLICY "Only verified admins can access employees table directly" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.role = 'admin'::user_role
  )
);

-- Keep existing policies for admin full access and employee updates (they are secure)