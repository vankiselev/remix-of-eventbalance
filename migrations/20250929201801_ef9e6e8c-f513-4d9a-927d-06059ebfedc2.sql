-- Allow negative values for income_amount and expense_amount
ALTER TABLE public.financial_transactions 
  ALTER COLUMN income_amount DROP NOT NULL,
  ALTER COLUMN expense_amount DROP NOT NULL;

-- Remove any check constraints that might prevent negative values
-- (if they exist, this will handle them gracefully)
DO $$ 
BEGIN
  -- Try to drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'financial_transactions' 
    AND constraint_name LIKE '%income%positive%'
  ) THEN
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_income_amount_check;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'financial_transactions' 
    AND constraint_name LIKE '%expense%positive%'
  ) THEN
    ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_expense_amount_check;
  END IF;
END $$;