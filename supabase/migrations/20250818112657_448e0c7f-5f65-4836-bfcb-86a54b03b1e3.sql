-- Fix critical security issue: Company financial records accessible to all employees
-- Replace overly permissive SELECT policies with proper access controls

-- Fix expenses table policies
DROP POLICY IF EXISTS "All authenticated users can view expenses" ON public.expenses;

-- Create restricted SELECT policy for expenses - users can only view their own records
CREATE POLICY "Users can view their own expenses and admins can view all"
ON public.expenses
FOR SELECT
USING (
  -- Admins can view all expenses
  get_user_role(auth.uid()) = 'admin'::user_role
  OR 
  -- Users can only view expenses they created
  auth.uid() = created_by
);

-- Fix incomes table policies  
DROP POLICY IF EXISTS "All authenticated users can view incomes" ON public.incomes;

-- Create restricted SELECT policy for incomes - users can only view their own records
CREATE POLICY "Users can view their own incomes and admins can view all"
ON public.incomes
FOR SELECT
USING (
  -- Admins can view all incomes
  get_user_role(auth.uid()) = 'admin'::user_role
  OR 
  -- Users can only view incomes they created
  auth.uid() = created_by
);