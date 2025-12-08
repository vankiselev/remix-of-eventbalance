-- Make item_type nullable and add actual income/expense tracking
ALTER TABLE public.financial_report_items 
  ALTER COLUMN item_type DROP NOT NULL;

-- Add columns for tracking actual income and expense separately
ALTER TABLE public.financial_report_items 
  ADD COLUMN IF NOT EXISTS actual_income numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_expense numeric DEFAULT 0;