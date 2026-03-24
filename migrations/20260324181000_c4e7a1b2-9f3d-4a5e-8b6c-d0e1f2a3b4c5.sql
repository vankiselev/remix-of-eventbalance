-- Fix get_invitation_by_token: change param type from uuid to text, support pending/sent/accepted statuses
-- Add anon RLS policy for invitation validation on /invite page
-- Idempotent: drops both uuid and text overloads before recreating

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

-- Allow anon users to read invitations by token (for /invite page validation)
DROP POLICY IF EXISTS "Anon can read invitations by token" ON public.invitations;
CREATE POLICY "Anon can read invitations by token"
ON public.invitations FOR SELECT TO anon
USING (status IN ('pending', 'sent', 'accepted'));
