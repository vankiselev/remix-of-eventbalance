-- Add a column to store static project names in financial_transactions table
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS static_project_name TEXT;