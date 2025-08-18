-- Enable pgcrypto extension for hash functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix critical security issues in the invitation system

-- 1. Update the hash_token function to use a stronger hashing algorithm with proper type casting
CREATE OR REPLACE FUNCTION public.hash_token(token_value text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT encode(digest(token_value::bytea, 'sha256'::text), 'hex');
$$;

-- 2. Fix the invitation RLS policies to work properly
DROP POLICY IF EXISTS "Secure invitation access via functions only" ON public.invitations;

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