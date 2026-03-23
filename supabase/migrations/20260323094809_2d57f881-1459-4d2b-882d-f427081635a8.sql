
-- Drop ALL overloads of calculate_user_cash_totals to remove ambiguity
DROP FUNCTION IF EXISTS public.calculate_user_cash_totals(uuid);
DROP FUNCTION IF EXISTS public.calculate_user_cash_totals(uuid, uuid);

-- Recreate single unambiguous function
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(p_user_id uuid)
RETURNS TABLE(cash_type text, total_income numeric, total_expense numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ft.cash_type,
    COALESCE(SUM(ft.income_amount), 0) as total_income,
    COALESCE(SUM(ft.expense_amount), 0) as total_expense
  FROM public.financial_transactions ft
  WHERE ft.created_by = p_user_id
  GROUP BY ft.cash_type;
$$;
