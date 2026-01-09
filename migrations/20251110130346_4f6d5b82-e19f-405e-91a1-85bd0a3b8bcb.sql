-- Update get_admin_profiles to include name fields
DROP FUNCTION IF EXISTS public.get_admin_profiles();

CREATE FUNCTION public.get_admin_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  last_name text,
  first_name text,
  middle_name text,
  phone text,
  phone_e164 text,
  birth_date date,
  avatar_url text,
  role user_role,
  cash_nastya numeric,
  cash_lera numeric,
  cash_vanya numeric,
  total_cash_on_hand numeric,
  employment_status text,
  termination_date date,
  termination_reason text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    p.last_name,
    p.first_name,
    p.middle_name,
    p.phone,
    p.phone_e164,
    p.birth_date,
    p.avatar_url,
    p.role,
    p.cash_nastya,
    p.cash_lera,
    p.cash_vanya,
    p.total_cash_on_hand,
    p.employment_status,
    p.termination_date,
    p.termination_reason,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE get_current_user_role() = 'admin'::user_role;
$$;