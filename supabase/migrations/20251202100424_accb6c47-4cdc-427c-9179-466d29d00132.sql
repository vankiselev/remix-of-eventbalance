-- Drop and recreate get_user_basic_profile with role field
DROP FUNCTION IF EXISTS public.get_user_basic_profile();

CREATE FUNCTION public.get_user_basic_profile()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_full_name text,
  user_last_name text,
  user_first_name text,
  user_middle_name text,
  user_phone text,
  user_birth_date date,
  user_avatar_url text,
  user_position text,
  user_salary numeric,
  user_employment_status text,
  role text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    p.last_name as user_last_name,
    p.first_name as user_first_name,
    p.middle_name as user_middle_name,
    p.phone as user_phone,
    p.birth_date as user_birth_date,
    p.avatar_url as user_avatar_url,
    e.position as user_position,
    e.salary as user_salary,
    p.employment_status as user_employment_status,
    p.role::text as role
  FROM profiles p
  LEFT JOIN employees e ON e.user_id = p.id
  WHERE p.id = auth.uid();
END;
$$;