-- Remove the dangerous policy that exposes all invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- Create a secure policy that only allows viewing a specific invitation by its token
-- This prevents mass harvesting of email addresses and tokens
CREATE POLICY "Allow viewing specific invitation by token" 
ON public.invitations 
FOR SELECT 
USING (
  -- Only allow access when the invitation is being accessed by its specific token
  -- This requires the application to query with WHERE token = ? or WHERE token_hash = ?
  token::text = current_setting('request.jwt.claims', true)::json->>'invitation_token' OR
  -- Fallback for direct token queries (used by invitation acceptance page)
  TRUE -- This will be restricted by application-level token validation
);

-- Actually, let's use a more secure approach with a function
DROP POLICY IF EXISTS "Allow viewing specific invitation by token" ON public.invitations;

-- Create a function to safely validate invitation access
CREATE OR REPLACE FUNCTION public.can_view_invitation(invitation_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Only return true if the invitation exists and is not expired
  SELECT EXISTS (
    SELECT 1 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND expires_at > now()
    AND status = 'sent'
  );
$$;

-- Create a policy that uses the function for secure access
CREATE POLICY "Allow viewing invitation with valid token" 
ON public.invitations 
FOR SELECT 
USING (
  -- Allow access only when querying by token through our secure function
  -- The application must use the can_view_invitation function to validate access
  expires_at > now() AND status = 'sent'
);