-- Create get_invitation_for_registration RPC (used by register-invited-user edge function)
-- Returns invitation by token text, including tenant_id and invited_by for registration flow
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
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    i.id,
    i.tenant_id,
    i.invited_by,
    i.email,
    i.role,
    i.expires_at,
    i.status
  FROM public.invitations i
  WHERE i.token::text = invitation_token
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
$$;

-- Create accept_invitation_for_registration RPC
-- Marks invitation as accepted; idempotent (safe to call multiple times)
DROP FUNCTION IF EXISTS public.accept_invitation_for_registration(uuid);

CREATE OR REPLACE FUNCTION public.accept_invitation_for_registration(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_invitation_id
    AND status IN ('pending', 'sent');
END;
$$;

-- Also fix get_invitation_by_token to use explicit cast (for self-hosted compatibility)
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamp with time zone,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    i.id,
    i.email,
    i.role,
    i.expires_at,
    i.status
  FROM public.invitations i
  WHERE i.token::text = invitation_token
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
$$;

-- Ensure anon can read invitations for /invite page validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invitations'
    AND policyname = 'Anon can read invitations by token'
  ) THEN
    CREATE POLICY "Anon can read invitations by token"
    ON public.invitations FOR SELECT TO anon
    USING (status IN ('pending', 'sent', 'accepted'));
  END IF;
END $$;
