-- Create function to fetch current user's granted permission codes
CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(perm.code), ARRAY[]::text[])
  FROM public.user_role_assignments ura
  JOIN public.role_permissions rp ON rp.role_id = ura.role_id AND rp.granted = true
  JOIN public.permissions perm ON perm.id = rp.permission_id
  WHERE ura.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_permissions() TO authenticated;