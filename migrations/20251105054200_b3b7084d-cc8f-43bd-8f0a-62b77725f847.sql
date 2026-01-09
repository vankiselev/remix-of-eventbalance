-- Create unified function to get user profile with roles and permissions in one call
CREATE OR REPLACE FUNCTION public.get_user_profile_with_roles()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'last_name', p.last_name,
        'first_name', p.first_name,
        'middle_name', p.middle_name,
        'phone', p.phone,
        'birth_date', p.birth_date,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'employment_status', p.employment_status,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      FROM public.profiles p
      WHERE p.id = current_user_id
    ),
    'employee', (
      SELECT json_build_object(
        'id', e.id,
        'position', e.position,
        'hire_date', e.hire_date
      )
      FROM public.employees e
      WHERE e.user_id = current_user_id
    ),
    'rbac_roles', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', rd.name,
          'code', rd.code,
          'is_admin_role', rd.is_admin_role
        )
      ), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = current_user_id
    ),
    'permissions', (
      SELECT COALESCE(json_agg(DISTINCT perm.code), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_permissions rp ON rp.role_id = ura.role_id AND rp.granted = true
      JOIN public.permissions perm ON perm.id = rp.permission_id
      WHERE ura.user_id = current_user_id
    ),
    'legacy_roles', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'role', ur.role,
          'assigned_at', ur.assigned_at
        )
      ), '[]'::json)
      FROM public.user_roles ur
      WHERE ur.user_id = current_user_id
        AND ur.revoked_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;