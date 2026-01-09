-- Fix the function search path security issue
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
SET search_path = public
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