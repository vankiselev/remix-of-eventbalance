DROP FUNCTION IF EXISTS public.approve_pending_user_membership(uuid);

CREATE OR REPLACE FUNCTION public.approve_pending_user_membership(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_invitation_role text;
  v_existing_membership_id uuid;
  v_new_membership_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_tenant_id IS NULL THEN
    SELECT i.tenant_id, i.role
    INTO v_tenant_id, v_invitation_role
    FROM public.invitations i
    JOIN public.profiles p ON lower(p.email) = lower(i.email)
    WHERE p.id = p_user_id
      AND i.status IN ('accepted', 'pending', 'sent')
      AND i.tenant_id IS NOT NULL
    ORDER BY i.created_at DESC
    LIMIT 1;
  ELSE
    SELECT i.role INTO v_invitation_role
    FROM public.invitations i
    JOIN public.profiles p ON lower(p.email) = lower(i.email)
    WHERE p.id = p_user_id
      AND i.tenant_id = v_tenant_id
    ORDER BY i.created_at DESC
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tenant found for user');
  END IF;

  SELECT id INTO v_existing_membership_id
  FROM public.tenant_memberships
  WHERE tenant_id = v_tenant_id AND user_id = p_user_id;

  IF v_existing_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'membership_id', v_existing_membership_id, 'already_existed', true);
  END IF;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, p_user_id, COALESCE(v_invitation_role, 'member'))
  RETURNING id INTO v_new_membership_id;

  RETURN jsonb_build_object('success', true, 'membership_id', v_new_membership_id, 'already_existed', false);
END;
$$;