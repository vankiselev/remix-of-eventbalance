-- Add performance indexes for financial transactions
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_by_date 
ON public.financial_transactions(created_by, operation_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_verification 
ON public.financial_transactions(verification_status) 
WHERE requires_verification = true;

CREATE INDEX IF NOT EXISTS idx_financial_attachments_transaction 
ON public.financial_attachments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_financial_audit_log_transaction_date 
ON public.financial_audit_log(transaction_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer_recipient
ON public.financial_transactions(transfer_to_user_id)
WHERE transfer_status = 'pending';

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_cash_type
ON public.financial_transactions(created_by, cash_type, operation_date DESC);