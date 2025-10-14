-- Fix get_employee_cash_summary function to use correct cash_type values
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(SUM(COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)), 0) as total_cash,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Настя' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_nastya,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Лера' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_lera,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Ваня' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_vanya
    
  FROM public.financial_transactions
  WHERE created_by = employee_user_id;
$$;