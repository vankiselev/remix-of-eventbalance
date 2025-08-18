-- Fix function search path security issues with simple hashing

-- Update hash_token function to use md5 (available by default)
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(token_value);
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