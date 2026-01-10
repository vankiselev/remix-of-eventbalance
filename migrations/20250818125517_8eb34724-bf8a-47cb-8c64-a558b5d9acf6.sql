-- Fix function search path security issues

-- Update hash_token function
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(digest(token_value, 'sha256'), 'hex');
$$;

-- Update hash_invitation_token function
CREATE OR REPLACE FUNCTION public.hash_invitation_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.token_hash = public.hash_token(NEW.token::text);
  RETURN NEW;
END;
$$;

-- Update hash_password_reset_token function
CREATE OR REPLACE FUNCTION public.hash_password_reset_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.token_hash = public.hash_token(NEW.token::text);
  RETURN NEW;
END;
$$;