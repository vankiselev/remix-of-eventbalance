BEGIN;

-- Remove restrictive ALL policy that blocks non-admins
DROP POLICY IF EXISTS "Admins can manage all financial transactions" ON public.financial_transactions;

COMMIT;