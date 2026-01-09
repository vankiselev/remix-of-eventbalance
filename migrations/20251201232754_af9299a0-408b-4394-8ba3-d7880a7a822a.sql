-- Drop old INSERT policy
DROP POLICY IF EXISTS "Active users can create transactions" ON public.financial_transactions;

-- Create new INSERT policy allowing admins to create transactions for any user
CREATE POLICY "Active users can create transactions" ON public.financial_transactions
FOR INSERT
TO public
WITH CHECK (
  (
    -- Active users can create their own transactions
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND employment_status = 'active'
    )
  )
  OR
  -- Admins can create transactions for any user
  is_admin_user(auth.uid())
);