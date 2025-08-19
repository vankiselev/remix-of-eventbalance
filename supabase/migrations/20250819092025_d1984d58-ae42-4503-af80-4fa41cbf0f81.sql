-- Create secure password reset functions
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  reset_token uuid;
BEGIN
  -- Check if user exists
  SELECT * INTO user_record FROM auth.users WHERE email = user_email LIMIT 1;
  
  IF NOT FOUND THEN
    -- Don't reveal if email exists, return success anyway
    RETURN true;
  END IF;
  
  -- Generate new reset token
  reset_token := gen_random_uuid();
  
  -- Clean up any existing unused tokens for this user
  DELETE FROM public.password_reset_tokens 
  WHERE user_id = user_record.id AND used_at IS NULL;
  
  -- Insert new reset token (trigger will hash it)
  INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
  VALUES (user_record.id, reset_token, now() + interval '1 hour');
  
  RETURN true;
END;
$$;

-- Create function to validate and use reset token
CREATE OR REPLACE FUNCTION public.reset_password_with_token(reset_token uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record password_reset_tokens%ROWTYPE;
  token_hash_value text;
BEGIN
  -- Hash the provided token
  token_hash_value := public.hash_token(reset_token::text);
  
  -- Find valid token
  SELECT * INTO token_record
  FROM public.password_reset_tokens
  WHERE token_hash = token_hash_value
    AND expires_at > now()
    AND used_at IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE id = token_record.id;
  
  -- Update user password (this will be handled by the client using Supabase auth)
  -- The token validation is what we're securing here
  
  RETURN true;
END;
$$;

-- Create function to validate reset token (for client use)
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(reset_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_hash_value text;
BEGIN
  -- Hash the provided token
  token_hash_value := public.hash_token(reset_token::text);
  
  -- Check if token exists and is valid
  RETURN EXISTS (
    SELECT 1 FROM public.password_reset_tokens
    WHERE token_hash = token_hash_value
      AND expires_at > now()
      AND used_at IS NULL
  );
END;
$$;