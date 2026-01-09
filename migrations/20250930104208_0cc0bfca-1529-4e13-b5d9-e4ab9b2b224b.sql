-- Remove the valid_amounts check constraint that prevents negative values
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS valid_amounts;

-- Also remove any other check constraints on amount columns
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_expense_amount_check;

ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_income_amount_check;