-- Create invitations system tables

-- Create invitations table
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired', 'revoked')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  first_name text,
  last_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invitations
CREATE POLICY "Admins can manage all invitations" 
ON public.invitations 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Allow anyone to view invitation by token (for accepting invitations)
CREATE POLICY "Anyone can view invitation by token" 
ON public.invitations 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for password reset tokens
CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow anyone to view reset token by token (for password reset)
CREATE POLICY "Anyone can view reset token by token" 
ON public.password_reset_tokens 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Create audit log table for tracking invitation events
CREATE TABLE public.invitation_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('created', 'sent', 'accepted', 'revoked', 'expired', 'resent')),
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitation_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit log
CREATE POLICY "Admins can view all audit logs" 
ON public.invitation_audit_log 
FOR SELECT 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create indexes for performance
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Create function to hash tokens
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT encode(digest(token_value, 'sha256'), 'hex');
$$;

-- Create trigger to hash invitation tokens
CREATE OR REPLACE FUNCTION public.hash_invitation_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.token_hash = public.hash_token(NEW.token::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_invitation_token_trigger
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_invitation_token();

-- Create trigger to hash password reset tokens
CREATE OR REPLACE FUNCTION public.hash_password_reset_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.token_hash = public.hash_token(NEW.token::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_password_reset_token_trigger
  BEFORE INSERT OR UPDATE ON public.password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_password_reset_token();

-- Create trigger for updated_at on invitations
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();