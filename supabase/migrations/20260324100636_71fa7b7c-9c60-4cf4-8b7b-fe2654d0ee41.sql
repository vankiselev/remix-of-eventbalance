
-- Create SECURITY DEFINER RPC for safe membership creation during invite registration
-- This replaces direct insert into tenant_memberships from edge functions

CREATE OR REPLACE FUNCTION public.ensure_invited_user_membership(
  p_invitation_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_invitation_email text;
  v_invitation_status text;
  v_existing_membership_id uuid;
  v_new_membership_id uuid;
BEGIN
  -- Step 1: Validate invitation exists and get tenant_id
  SELECT i.tenant_id, i.email, i.status
  INTO v_tenant_id, v_invitation_email, v_invitation_status
  FROM public.invitations i
  WHERE i.id = p_invitation_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or has no tenant');
  END IF;

  -- Step 2: Check invitation status is valid for membership creation
  IF v_invitation_status NOT IN ('pending', 'sent', 'accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation status: ' || COALESCE(v_invitation_status, 'null'));
  END IF;

  -- Step 3: Check if membership already exists
  SELECT id INTO v_existing_membership_id
  FROM public.tenant_memberships
  WHERE tenant_id = v_tenant_id AND user_id = p_user_id;

  IF v_existing_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'membership_id', v_existing_membership_id, 'already_existed', true);
  END IF;

  -- Step 4: Create membership
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, p_user_id, COALESCE(p_role, 'member'))
  RETURNING id INTO v_new_membership_id;

  RETURN jsonb_build_object('success', true, 'membership_id', v_new_membership_id, 'already_existed', false);
END;
$$;
