-- Create optimized RPC function for dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_events', (SELECT COUNT(*) FROM events WHERE is_archived = false),
    'total_income', COALESCE((SELECT SUM(income_amount) FROM financial_transactions), 0),
    'total_expenses', COALESCE((SELECT SUM(expense_amount) FROM financial_transactions), 0),
    'cash_nastya', COALESCE((
      SELECT SUM(COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)) 
      FROM financial_transactions 
      WHERE LOWER(TRIM(cash_type)) = 'наличка настя'
    ), 0),
    'cash_lera', COALESCE((
      SELECT SUM(COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)) 
      FROM financial_transactions 
      WHERE LOWER(TRIM(cash_type)) = 'наличка лера'
    ), 0),
    'cash_vanya', COALESCE((
      SELECT SUM(COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)) 
      FROM financial_transactions 
      WHERE LOWER(TRIM(cash_type)) = 'наличка ваня'
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create bulk cash calculations RPC for Staff page optimization
CREATE OR REPLACE FUNCTION get_all_users_cash_totals()
RETURNS TABLE (
  user_id uuid,
  total_cash numeric,
  cash_nastya numeric,
  cash_lera numeric,
  cash_vanya numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.created_by as user_id,
    COALESCE(SUM(COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)), 0) as total_cash,
    COALESCE(SUM(
      CASE 
        WHEN LOWER(TRIM(ft.cash_type)) = 'наличка настя' 
        THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_nastya,
    COALESCE(SUM(
      CASE 
        WHEN LOWER(TRIM(ft.cash_type)) = 'наличка лера'
        THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_lera,
    COALESCE(SUM(
      CASE 
        WHEN LOWER(TRIM(ft.cash_type)) = 'наличка ваня'
        THEN COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)
        ELSE 0
      END
    ), 0) as cash_vanya
  FROM financial_transactions ft
  GROUP BY ft.created_by;
END;
$$;