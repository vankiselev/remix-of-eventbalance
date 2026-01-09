-- Fix security vulnerability in invitation system
-- Remove the overly permissive policy that allows viewing all active invitations
DROP POLICY IF EXISTS "Allow viewing specific invitation by token hash" ON public.invitations;

-- Create a secure function to validate and retrieve invitation by token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token uuid)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  role user_role,
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
    i.first_name,
    i.last_name,
    i.role,
    i.expires_at,
    i.status
  FROM public.invitations i
  WHERE i.token = invitation_token 
    AND i.expires_at > now()
    AND i.status = 'sent'
  LIMIT 1;
$$;

-- Create a secure function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.invitations 
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE token = invitation_token 
    AND expires_at > now()
    AND status = 'sent'
  RETURNING true;
$$;

-- Add a new restrictive policy that only allows viewing invitations through the secure function
-- This policy will only be used by the security definer functions above
CREATE POLICY "Secure invitation access via functions only"
ON public.invitations
FOR SELECT
USING (false); -- This effectively blocks direct access, forcing use of security definer functions