-- Update get_user_profile_with_roles to determine pending status
-- via tenant_memberships check instead of non-existent invitation_status column
-- This is self-hosted compatible: no reference to invitation_status, role, employment_status

DROP FUNCTION IF EXISTS public.get_user_profile_with_roles();

CREATE OR REPLACE FUNCTION public.get_user_profile_with_roles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_middle_name text;
  v_full_name text;
  v_avatar_url text;
  v_has_membership boolean;
  user_roles jsonb;
  user_permissions jsonb;
BEGIN
  SELECT 
    p.id, p.email, p.first_name, p.last_name, p.middle_name, p.full_name, p.avatar_url
  INTO 
    v_id, v_email, v_first_name, v_last_name, v_middle_name, v_full_name, v_avatar_url
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('profile', null, 'rbac_roles', '[]'::jsonb, 'permissions', '[]'::jsonb);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships WHERE user_id = auth.uid()
  ) INTO v_has_membership;
  
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('name', rd.name, 'code', rd.code, 'is_admin_role', rd.is_admin_role)
  ), '[]'::jsonb)
  INTO user_roles
  FROM public.user_role_assignments ura
  JOIN public.role_definitions rd ON rd.id = ura.role_id
  WHERE ura.user_id = auth.uid();
  
  BEGIN
    SELECT COALESCE(jsonb_agg(DISTINCT perm.code), '[]'::jsonb)
    INTO user_permissions
    FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON rp.role_id = ura.role_id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE ura.user_id = auth.uid();
  EXCEPTION WHEN undefined_table THEN
    user_permissions := '[]'::jsonb;
  END;
  
  result := jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_id, 'email', v_email,
      'first_name', v_first_name, 'last_name', v_last_name,
      'middle_name', v_middle_name, 'full_name', v_full_name,
      'avatar_url', v_avatar_url, 'has_membership', v_has_membership
    ),
    'rbac_roles', user_roles,
    'permissions', COALESCE(user_permissions, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;
