-- Fix security issue: Restrict financial data access to admins only
-- Drop the overly permissive policy that allows all users to view financial data
DROP POLICY IF EXISTS "All authenticated users can view financial transactions" ON public.financial_transactions;

-- Create a new restrictive policy that only allows admins to view financial transactions
CREATE POLICY "Only admins can view financial transactions" 
ON public.financial_transactions 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Also update the INSERT policy to be more restrictive if needed
-- Users can still create transactions but only admins can view the complete financial picture
DROP POLICY IF EXISTS "All authenticated users can create financial transactions" ON public.financial_transactions;

CREATE POLICY "Only admins can create financial transactions" 
ON public.financial_transactions 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Update the UPDATE policy to be admin-only as well for consistency
DROP POLICY IF EXISTS "Users can update their own financial transactions" ON public.financial_transactions;

CREATE POLICY "Only admins can update financial transactions" 
ON public.financial_transactions 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);