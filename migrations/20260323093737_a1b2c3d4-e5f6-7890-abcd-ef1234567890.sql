-- Fix cash summary functions: total_cash = ALL transactions, wallets use TRIM matching

-- 1. calculate_user_cash_totals (single user, used by useUserCashSummary hook)
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(COALESCE(income_amount,0) - COALESCE(expense_amount,0)), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
  FROM public.financial_transactions
  WHERE created_by = user_uuid;
$$;

-- 2. Overload with optional params
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(p_user_id uuid DEFAULT NULL, user_uuid uuid DEFAULT NULL)
RETURNS TABLE(cash_type text, total_income numeric, total_expense numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ft.cash_type,
    SUM(ft.income_amount) as total_income,
    SUM(ft.expense_amount) as total_expense
  FROM public.financial_transactions ft
  WHERE ft.created_by = COALESCE(p_user_id, user_uuid)
  GROUP BY ft.cash_type;
$$;

-- 3. get_company_cash_summary (all transactions, no user filter)
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(COALESCE(income_amount,0) - COALESCE(expense_amount,0)), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
  FROM public.financial_transactions;
$$;

-- 4. get_employee_cash_summary (single employee with auth check)
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF employee_user_id != auth.uid() AND NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot view other employees financial data';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0)), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Настя' THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Лера'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Ваня'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_vanya
  FROM public.financial_transactions ft
  WHERE ft.created_by = employee_user_id;
END;
$$;

-- 5. get_all_users_cash_totals (admin view)
CREATE OR REPLACE FUNCTION public.get_all_users_cash_totals()
RETURNS TABLE(user_id uuid, total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.created_by as user_id,
    COALESCE(SUM(COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0)), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Настя' THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Лера'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN TRIM(ft.cash_type) = 'Наличка Ваня'  THEN COALESCE(ft.income_amount,0) - COALESCE(ft.expense_amount,0) ELSE 0 END), 0) AS cash_vanya
  FROM financial_transactions ft
  GROUP BY ft.created_by;
END;
$$;
