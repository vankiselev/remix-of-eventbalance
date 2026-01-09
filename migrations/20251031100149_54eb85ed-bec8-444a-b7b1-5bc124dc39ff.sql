-- Add name fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Migrate existing full_name data to new fields
-- Split full_name by spaces: "Иванов Иван Иванович" -> last_name, first_name, middle_name
UPDATE public.profiles
SET 
  last_name = SPLIT_PART(full_name, ' ', 1),
  first_name = SPLIT_PART(full_name, ' ', 2),
  middle_name = NULLIF(SPLIT_PART(full_name, ' ', 3), '')
WHERE full_name IS NOT NULL AND full_name != '';

-- Drop and recreate get_user_basic_profile function to include new fields and position
DROP FUNCTION IF EXISTS public.get_user_basic_profile();

CREATE FUNCTION public.get_user_basic_profile()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  last_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  phone TEXT,
  birth_date DATE,
  avatar_url TEXT,
  role user_role,
  user_position TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.last_name,
    p.first_name,
    p.middle_name,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.role,
    e."position" as user_position,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN public.employees e ON e.user_id = p.id
  WHERE p.id = auth.uid();
$$;

-- Drop and recreate get_all_basic_profiles function to include new fields
DROP FUNCTION IF EXISTS public.get_all_basic_profiles();

CREATE FUNCTION public.get_all_basic_profiles()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  last_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  role user_role,
  phone TEXT,
  birth_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  employment_status TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.last_name,
    p.first_name,
    p.middle_name,
    p.role,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.created_at,
    p.employment_status
  FROM public.profiles p
  WHERE p.employment_status = 'active';
$$;