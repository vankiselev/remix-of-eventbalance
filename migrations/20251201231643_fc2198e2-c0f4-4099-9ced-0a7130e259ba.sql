-- Fix get_all_users_cash_totals to calculate total_cash as sum of three cash types
CREATE OR REPLACE FUNCTION public.get_all_users_cash_totals()
 RETURNS TABLE(user_id uuid, total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH cash_sums AS (
    SELECT 
      ft.created_by,
      COALESCE(SUM(
        CASE 
          WHEN LOWER(TRIM(ft.cash_type)) = 'наличка настя' 
          THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as nastya,
      COALESCE(SUM(
        CASE 
          WHEN LOWER(TRIM(ft.cash_type)) = 'наличка лера'
          THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as lera,
      COALESCE(SUM(
        CASE 
          WHEN LOWER(TRIM(ft.cash_type)) = 'наличка ваня'
          THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
          ELSE 0
        END
      ), 0) as vanya
    FROM financial_transactions ft
    GROUP BY ft.created_by
  )
  SELECT 
    cash_sums.created_by as user_id,
    (nastya + lera + vanya) as total_cash,
    nastya as cash_nastya,
    lera as cash_lera,
    vanya as cash_vanya
  FROM cash_sums;
END;
$function$;