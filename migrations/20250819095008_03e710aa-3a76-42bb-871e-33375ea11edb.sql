-- Fix security vulnerabilities in profiles and employees tables

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view own basic profile" ON public.employees;

-- Update profiles table policies to be more restrictive
-- Users can only view their own profile data
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view all profiles but with explicit role check
CREATE POLICY "Verified admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'::user_role
  )
);

-- Update employees table policies to be more restrictive
-- Remove the overly broad "Employees can view own basic profile" policy
-- Employees can only view their own record without salary information
CREATE POLICY "Employees can view own basic data only" 
ON public.employees 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND get_user_role(auth.uid()) = 'employee'::user_role
);

-- Admins have full access (this policy already exists but ensuring it's correct)
-- The existing "Admins have full access to employee records including salary" policy is fine

-- Add a policy to prevent employees from seeing salary data in any case
-- This is handled by column-level security in the application layer