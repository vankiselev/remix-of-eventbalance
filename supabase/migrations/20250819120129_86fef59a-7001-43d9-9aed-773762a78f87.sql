-- Add admin policy to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (get_current_user_role() = 'admin'::user_role);

-- Update get_admin_profiles function to be simpler and avoid recursion issues
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE(id uuid, email text, full_name text, phone text, birth_date date, avatar_url text, role user_role, cash_nastya numeric, cash_lera numeric, cash_vanya numeric, total_cash_on_hand numeric, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.role,
    p.cash_nastya,
    p.cash_lera,
    p.cash_vanya,
    p.total_cash_on_hand,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE get_current_user_role() = 'admin'::user_role;
$$;