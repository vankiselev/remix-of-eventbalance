BEGIN;

DROP POLICY IF EXISTS "Users can insert transactions (trigger sets owner)" ON public.financial_transactions;
CREATE POLICY "Users can insert transactions (trigger sets owner)"
ON public.financial_transactions
FOR INSERT
WITH CHECK (true);

COMMIT;