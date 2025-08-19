-- Update the reset password function to actually update the password
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
  
  -- Update the user's password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = token_record.user_id;
  
  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE id = token_record.id;
  
  RETURN true;
END;
$$;