-- Drop existing function
DROP FUNCTION IF EXISTS get_user_basic_profile();

-- Recreate function with salary field
CREATE OR REPLACE FUNCTION get_user_basic_profile()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_last_name TEXT,
  user_first_name TEXT,
  user_middle_name TEXT,
  user_phone TEXT,
  user_birth_date DATE,
  user_avatar_url TEXT,
  user_position TEXT,
  user_salary NUMERIC,
  user_employment_status TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
    p.employment_status as user_employment_status
  FROM profiles p
  LEFT JOIN employees e ON e.user_id = p.id
  WHERE p.id = auth.uid();
END;
$$;