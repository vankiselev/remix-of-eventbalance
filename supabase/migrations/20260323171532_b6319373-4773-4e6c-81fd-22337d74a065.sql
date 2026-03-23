-- Fix get_invitation_by_token: change param type from uuid to text, support pending/sent/accepted statuses
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
  WHERE i.token = invitation_token 
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at > now())
  LIMIT 1;
$$;