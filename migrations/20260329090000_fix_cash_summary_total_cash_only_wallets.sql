-- FIX: total_cash must equal sum of ONLY 3 cash wallets, not all transactions.
-- Previous migration incorrectly set total_cash = SUM(ALL transactions).

-- 1. calculate_user_cash_totals: returns grouped rows (no change needed, client parses)
-- Keeping as-is since it returns per-cash_type rows and client filters.

-- 2. get_company_cash_summary: FIX total_cash
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH sums AS (
    SELECT
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
    FROM public.financial_transactions
  )
  SELECT
    (cash_nastya + cash_lera + cash_vanya) AS total_cash,
    cash_nastya,
    cash_lera,
    cash_vanya
  FROM sums;
$$;

-- 3. get_employee_cash_summary: FIX total_cash
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH sums AS (
    SELECT
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
      COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
    FROM public.financial_transactions
    WHERE created_by = employee_user_id
  )
  SELECT
    (cash_nastya + cash_lera + cash_vanya) AS total_cash,
    cash_nastya,
    cash_lera,
    cash_vanya
  FROM sums;
$$;

-- 4. get_all_users_cash_totals: FIX total_cash
CREATE OR REPLACE FUNCTION public.get_all_users_cash_totals()
RETURNS TABLE(user_id uuid, total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH cash_sums AS (
    SELECT
      ft.created_by,
      COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Настя' THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS nastya,
      COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Лера'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS lera,
      COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Ваня'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS vanya
    FROM financial_transactions ft
    GROUP BY ft.created_by
  )
  SELECT
    cash_sums.created_by AS user_id,
    (nastya + lera + vanya) AS total_cash,
    nastya AS cash_nastya,
    lera AS cash_lera,
    vanya AS cash_vanya
  FROM cash_sums;
END;
$$;
