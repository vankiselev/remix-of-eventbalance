-- Fix RLS policy deadlock: Allow users to always read their own employment_status
-- This prevents the circular dependency where we need to check status to grant access to check status

-- Drop the restrictive policy for viewing own profile
DROP POLICY IF EXISTS "Active users can view own profile" ON profiles;

-- Create new policy that allows users to view their own profile regardless of status
-- This is safe because users should always be able to check their own employment status
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Keep the update policy restricted to active users
-- (The existing "Active users can update own profile" policy is correct)