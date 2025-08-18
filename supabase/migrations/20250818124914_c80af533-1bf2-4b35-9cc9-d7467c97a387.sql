-- Update RLS policies for financial_transactions to allow authenticated users to create transactions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can create financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Only admins can view financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Only admins can update financial transactions" ON public.financial_transactions;

-- Create new policies that allow authenticated users to manage their own transactions
-- All authenticated users can create transactions (with their user_id in created_by)
CREATE POLICY "Authenticated users can create their own transactions" 
ON public.financial_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can view their own transactions, admins can view all
CREATE POLICY "Users can view their own transactions, admins can view all" 
ON public.financial_transactions 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

-- Users can update their own transactions, admins can update all
CREATE POLICY "Users can update their own transactions, admins can update all" 
ON public.financial_transactions 
FOR UPDATE 
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
)
WITH CHECK (
  (auth.uid() = created_by) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

-- Users can delete their own transactions, admins can delete all
CREATE POLICY "Users can delete their own transactions, admins can delete all" 
ON public.financial_transactions 
FOR DELETE 
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);