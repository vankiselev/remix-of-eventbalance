-- Delete all financial data to allow fresh import
DELETE FROM public.financial_attachments;
DELETE FROM public.financial_audit_log;
DELETE FROM public.financial_transactions;