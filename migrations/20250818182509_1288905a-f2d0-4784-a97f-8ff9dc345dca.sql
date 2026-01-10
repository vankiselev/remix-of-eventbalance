-- Fix critical security issues in the invitation system

-- 1. Update the hash_token function to use a stronger hashing algorithm
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT encode(digest(token_value, 'sha256'), 'hex');
$$;

-- 2. Fix the invitation RLS policies to work properly
DROP POLICY IF EXISTS "Secure invitation access via functions only" ON public.invitations;
DROP POLICY IF EXISTS "Allow access via secure functions only" ON public.invitations;

-- Create a proper policy for invitation access via functions
CREATE POLICY "Allow access via secure functions only"
ON public.invitations
FOR SELECT
USING (false);

-- Allow system to insert invitations (for admin users)
CREATE POLICY "Admins can create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Allow system to update invitations (for accepting them)
CREATE POLICY "Allow system updates for accepting invitations" 
ON public.invitations 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 3. Update the get_invitation_by_token function to use hash comparison
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
  WHERE i.token_hash = public.hash_token(invitation_token::text)
    AND i.expires_at > now()
    AND i.status = 'sent'
  LIMIT 1;
$$;

-- 4. Update the accept_invitation function to use hash comparison
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record invitations%ROWTYPE;
BEGIN
  -- Get invitation details using hash comparison
  SELECT * INTO invitation_record
  FROM public.invitations 
  WHERE token_hash = public.hash_token(invitation_token::text)
    AND expires_at > now()
    AND status = 'sent';
    
  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE public.invitations 
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE token_hash = public.hash_token(invitation_token::text);
  
  -- Insert audit log
  INSERT INTO public.invitation_audit_log (invitation_id, action, details)
  VALUES (invitation_record.id, 'accepted', jsonb_build_object('email', invitation_record.email));
  
  RETURN true;
END;
$$;

-- 5. Fix password reset token access - remove user access to tokens
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;

-- Only allow system functions to access password reset tokens
CREATE POLICY "No direct access to password reset tokens" 
ON public.password_reset_tokens 
FOR ALL
USING (false);

-- 6. Create a function to validate invitation tokens more securely
CREATE OR REPLACE FUNCTION public.validate_invitation_token(invitation_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.invitations 
    WHERE token_hash = public.hash_token(invitation_token::text)
    AND expires_at > now()
    AND status = 'sent'
  );
$$;