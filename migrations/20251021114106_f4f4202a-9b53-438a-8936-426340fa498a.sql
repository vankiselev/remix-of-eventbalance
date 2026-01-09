-- Обновляем функцию get_all_basic_profiles() чтобы возвращать только активных сотрудников
-- Обычные сотрудники не должны видеть уволенных коллег

DROP FUNCTION IF EXISTS public.get_all_basic_profiles();

CREATE OR REPLACE FUNCTION public.get_all_basic_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role user_role,
  phone text,
  birth_date date,
  avatar_url text,
  created_at timestamp with time zone,
  employment_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.created_at,
    p.employment_status
  FROM public.profiles p
  WHERE p.employment_status = 'active';
$function$;