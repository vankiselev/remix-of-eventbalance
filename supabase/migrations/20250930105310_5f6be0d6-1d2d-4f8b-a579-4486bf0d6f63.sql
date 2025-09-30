-- Add balance_after column to financial_transactions
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS balance_after NUMERIC DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.financial_transactions.balance_after IS 'Balance after this transaction for the specific cash type';