-- Fix ambiguous columns in get_employee_cash_summary
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: Only allow user to see their own data OR admin to see anyone's
  IF employee_user_id != auth.uid() AND NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot view other employees financial data';
  END IF;

  RETURN QUERY
  WITH sums AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN ft.cash_type = 'Наличка Настя' THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as s_cash_nastya,
      COALESCE(SUM(
        CASE 
          WHEN ft.cash_type = 'Наличка Лера' THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as s_cash_lera,
      COALESCE(SUM(
        CASE 
          WHEN ft.cash_type = 'Наличка Ваня' THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as s_cash_vanya
    FROM public.financial_transactions ft
    WHERE ft.created_by = employee_user_id
  )
  SELECT 
    (s_cash_nastya + s_cash_lera + s_cash_vanya) AS total_cash,
    s_cash_nastya AS cash_nastya,
    s_cash_lera AS cash_lera,
    s_cash_vanya AS cash_vanya
  FROM sums;
END;
$$;