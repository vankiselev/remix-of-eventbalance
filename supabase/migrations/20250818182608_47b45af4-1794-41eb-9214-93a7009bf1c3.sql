-- Fix the invitation system using MD5 hashing for now
-- This will make the system work while maintaining reasonable security

-- 1. Keep the existing hash_token function (it uses MD5)
-- Just ensure it's properly defined
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT md5(token_value);
$$;

-- 2. Fix the invitation RLS policies
DROP POLICY IF EXISTS "Secure invitation access via functions only" ON public.invitations;

-- Allow access only via secure functions
CREATE POLICY "Allow access via secure functions only" 
ON public.invitations 
FOR SELECT 
USING (false);

-- Allow admin to create invitations
CREATE POLICY "Admins can create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Allow system to update invitations for acceptance
CREATE POLICY "System can update invitations" 
ON public.invitations 
FOR UPDATE 
USING (true);

-- 3. Fix the get_invitation_by_token function
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token uuid)
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role user_role, expires_at timestamp with time zone, status text)
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

-- 4. Fix the accept_invitation function  
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record invitations%ROWTYPE;
BEGIN
  -- Get invitation details
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

-- 5. Fix password reset tokens access
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;

CREATE POLICY "No direct access to password reset tokens" 
ON public.password_reset_tokens 
FOR ALL
USING (false);