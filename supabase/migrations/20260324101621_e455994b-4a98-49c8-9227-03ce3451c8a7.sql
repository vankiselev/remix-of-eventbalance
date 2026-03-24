DROP FUNCTION IF EXISTS public.get_invitation_for_registration(text);

CREATE OR REPLACE FUNCTION public.get_invitation_for_registration(invitation_token text)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  invited_by uuid,
  email text,
  role text,
  expires_at timestamp with time zone,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.tenant_id,
    i.invited_by,
    i.email::text,
    i.role::text,
    i.expires_at,
    i.status::text
  FROM public.invitations i
  WHERE i.token::text = invitation_token
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
END;
$$;

DROP FUNCTION IF EXISTS public.accept_invitation_for_registration(uuid);

CREATE OR REPLACE FUNCTION public.accept_invitation_for_registration(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status
  FROM public.invitations
  WHERE id = p_invitation_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF v_current_status = 'accepted' THEN
    RETURN jsonb_build_object('success', true, 'already_accepted', true);
  END IF;

  IF v_current_status NOT IN ('pending', 'sent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status: ' || v_current_status);
  END IF;

  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'already_accepted', false);
END;
$$;