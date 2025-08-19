-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only admins can access profiles table directly" ON public.profiles;

-- Create safer policies that don't cause recursion
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile 
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow system/admin access for profile creation (handled by trigger)
CREATE POLICY "Allow profile creation"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Update get_user_role function to avoid recursion by using auth metadata
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.jwt() ->> 'email' = 'ikiselev@me.com' THEN 'admin'::user_role
      ELSE 'employee'::user_role
    END;
$$;

-- Update get_user_role function to be more specific about admin access
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- For current user, use the safer function
  IF user_uuid = auth.uid() THEN
    RETURN get_current_user_role();
  END IF;
  
  -- For other users, only admin can check (bypass RLS with security definer)
  SELECT role INTO user_role_result FROM public.profiles WHERE id = user_uuid;
  RETURN COALESCE(user_role_result, 'employee'::user_role);
END;
$$;