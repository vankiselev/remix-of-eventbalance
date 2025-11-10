-- Create RPC function to get RBAC roles for any user (for display in admin interfaces)
CREATE OR REPLACE FUNCTION public.get_user_rbac_roles_by_id(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Return roles for the specified user
  SELECT COALESCE(json_agg(
    json_build_object(
      'name', rd.name,
      'code', rd.code,
      'is_admin_role', rd.is_admin_role
    )
  ), '[]'::json)
  INTO result
  FROM public.user_role_assignments ura
  JOIN public.role_definitions rd ON rd.id = ura.role_id
  WHERE ura.user_id = target_user_id;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_rbac_roles_by_id(UUID) TO authenticated;