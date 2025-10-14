-- Create function to get all basic profiles (without financial data)
-- This allows all authenticated users to see basic info about other users
CREATE OR REPLACE FUNCTION public.get_all_basic_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role user_role,
  phone text,
  birth_date date,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.created_at
  FROM public.profiles p;
$$;