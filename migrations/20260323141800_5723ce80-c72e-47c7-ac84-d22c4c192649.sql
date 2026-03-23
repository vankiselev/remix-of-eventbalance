-- Index for get_all_users_cash_totals and calculate_user_cash_totals RPCs
-- Covers GROUP BY created_by + SUM aggregations on income/expense with cash_type filtering
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_by_cash_agg
ON public.financial_transactions (created_by)
INCLUDE (income_amount, expense_amount, cash_type);
