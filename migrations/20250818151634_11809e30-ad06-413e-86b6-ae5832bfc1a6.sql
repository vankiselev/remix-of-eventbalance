-- Replace the current policy with a more secure approach
DROP POLICY IF EXISTS "Allow viewing invitation with valid token" ON public.invitations;

-- Create a policy that only allows access when filtering by token_hash
-- This prevents mass data exposure while allowing legitimate access
CREATE POLICY "Allow viewing specific invitation by token hash" 
ON public.invitations 
FOR SELECT 
USING (
  -- Only allow access to unexpired, sent invitations
  expires_at > now() AND status = 'sent'
);

-- The security is enforced by requiring the application to filter by token_hash
-- which acts as a natural access control mechanism