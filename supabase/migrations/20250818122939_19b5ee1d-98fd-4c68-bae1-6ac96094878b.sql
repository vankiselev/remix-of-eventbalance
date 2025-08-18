-- Fix the security definer view issue by dropping it and using a different approach
DROP VIEW IF EXISTS public.employee_profile;

-- Instead, create a function that employees can use to get their own data (without salary)
CREATE OR REPLACE FUNCTION public.get_my_employee_profile()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  "position" text,
  hire_date date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    e.id,
    e.user_id,
    e."position",
    e.hire_date,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE e.user_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_employee_profile() TO authenticated;