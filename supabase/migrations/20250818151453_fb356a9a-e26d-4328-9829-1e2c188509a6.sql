-- Fix the function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.can_view_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only return true if the invitation exists and is not expired
  SELECT EXISTS (
    SELECT 1 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND expires_at > now()
    AND status = 'sent'
  );
$$;