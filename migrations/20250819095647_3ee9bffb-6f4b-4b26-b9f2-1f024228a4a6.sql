-- Fix financial data exposure in profiles table
-- Create a security definer function to prevent RLS recursion issues

-- Create a security definer function to safely get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Verified admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create secure function for users to get their own basic profile (without financial data)
CREATE OR REPLACE FUNCTION public.get_user_basic_profile()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  birth_date date,
  avatar_url text,
  role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.birth_date,
    p.avatar_url,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Create secure function for admins to get all profiles (including financial data)
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  birth_date date,
  avatar_url text,
  role user_role,
  cash_nastya numeric,
  cash_lera numeric,
  cash_vanya numeric,
  total_cash_on_hand numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.role = 'admin'::user_role
  );
$$;

-- Create new restrictive policy for direct table access
-- Only allow admins to access the main table directly through explicit role check
CREATE POLICY "Only admins can access profiles table directly" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.role = 'admin'::user_role
  )
);

-- Keep existing UPDATE policy for users to update their own profiles
-- This is safe because it doesn't expose financial data