-- Drop and recreate the function with a different approach
DROP FUNCTION IF EXISTS public.generate_user_api_key();

-- Function to generate a unique API key using gen_random_uuid
CREATE OR REPLACE FUNCTION public.generate_user_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate API key using multiple UUIDs
  RETURN 'sk_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
END;
$function$;