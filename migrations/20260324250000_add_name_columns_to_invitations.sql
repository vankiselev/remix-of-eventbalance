-- Add first_name and last_name columns to invitations table
-- Self-hosted compatible and idempotent

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS last_name text;

-- Recreate both possible overloads to avoid signature drift between environments
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  status text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    i.id,
    i.email,
    i.role,
    i.expires_at,
    i.status,
    i.first_name,
    i.last_name
  FROM public.invitations i
  WHERE i.token::text = invitation_token::text
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at IS NULL OR i.expires_at > now())
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;
