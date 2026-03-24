-- Invite-flow hotfix: make token lookup compatible with both token and token_hash storage
-- Self-hosted deployment source of truth: migrations/
-- Idempotent and safe to re-run

-- 1) Validate-step RPC
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.id, i.email, i.role, i.expires_at, i.status
  FROM public.invitations i
  WHERE (
      i.token::text = invitation_token
      OR (
        i.token_hash IS NOT NULL
        AND i.token_hash = public.hash_token(invitation_token::text)
      )
    )
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;

-- 2) Submit fallback RPC
DROP FUNCTION IF EXISTS public.get_invitation_for_registration(text);

CREATE OR REPLACE FUNCTION public.get_invitation_for_registration(invitation_token text)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  invited_by uuid,
  email text,
  role text,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  WHERE (
      i.token::text = invitation_token
      OR (
        i.token_hash IS NOT NULL
        AND i.token_hash = public.hash_token(invitation_token::text)
      )
    )
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  ORDER BY i.created_at DESC
  LIMIT 1;
END;
$$;
