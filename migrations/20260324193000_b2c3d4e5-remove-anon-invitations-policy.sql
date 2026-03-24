-- Remove overly broad anon policy on invitations
-- Validate flow should use SECURITY DEFINER RPC get_invitation_by_token instead
DROP POLICY IF EXISTS "Anon can read invitations by token" ON public.invitations;
