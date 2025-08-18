-- Fix RLS policy for invitation_audit_log to allow system to insert audit records
-- This policy will allow authenticated users to insert audit logs when they are performing invitation actions
CREATE POLICY "Allow system to insert invitation audit logs"
ON public.invitation_audit_log
FOR INSERT
WITH CHECK (true); -- Allow any authenticated user to insert audit logs

-- Also fix the accept_invitation function to properly handle the audit logging
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record invitations%ROWTYPE;
BEGIN
  -- Get invitation details first
  SELECT * INTO invitation_record
  FROM public.invitations 
  WHERE token = invitation_token 
    AND expires_at > now()
    AND status = 'sent';
    
  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE public.invitations 
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE token = invitation_token;
  
  -- Insert audit log
  INSERT INTO public.invitation_audit_log (invitation_id, action, details)
  VALUES (invitation_record.id, 'accepted', jsonb_build_object('email', invitation_record.email));
  
  RETURN true;
END;
$$;