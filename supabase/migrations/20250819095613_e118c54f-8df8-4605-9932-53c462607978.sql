-- Fix financial data exposure in profiles table
-- Create a security definer function to prevent RLS recursion issues

-- First, drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Verified admins can view all profiles" ON public.profiles;

-- Create a security definer function to safely get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create a view for non-financial profile data that regular users can access
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  id,
  email,
  full_name,
  phone,
  birth_date,
  avatar_url,
  role,
  created_at,
  updated_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.user_profiles SET (security_invoker = on);

-- Create policies for the view
CREATE POLICY "Users can view own basic profile data" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a view for financial profile data that only admins can access
CREATE OR REPLACE VIEW public.admin_profiles AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.birth_date,
  p.avatar_url,
  p.role,
  p.cash_nastya,
  p.cash_lera,
  p.cash_vanya,
  p.total_cash_on_hand,
  p.created_at,
  p.updated_at
FROM public.profiles p;

-- Enable RLS on the admin view
ALTER VIEW public.admin_profiles SET (security_invoker = on);

-- Create policy for admin view using the security definer function
CREATE POLICY "Admins can view all profile data including financial" 
ON public.admin_profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin'::user_role);

-- Update the main profiles table policies
-- Drop existing policies and create new restrictive ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create new restrictive policy for direct table access
-- Only allow admins to access the main table directly
CREATE POLICY "Only admins can access profiles table directly" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin'::user_role);

-- Regular users should use the user_profiles view instead
-- This ensures financial data is never exposed to non-admin users