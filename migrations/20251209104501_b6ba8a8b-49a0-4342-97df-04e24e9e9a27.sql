-- Add is_draft column to financial_transactions
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Index for fast draft filtering per user
CREATE INDEX IF NOT EXISTS idx_transactions_draft 
ON public.financial_transactions(created_by, is_draft) 
WHERE is_draft = true;

-- Comment for documentation
COMMENT ON COLUMN public.financial_transactions.is_draft IS 
'Черновик транзакции (голосовой ввод). Не видна финансистам до публикации.';