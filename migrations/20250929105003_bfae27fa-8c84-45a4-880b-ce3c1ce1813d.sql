-- Fix the company cash summary function to properly match Russian cash type values
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN income_amount > 0 THEN income_amount
        WHEN expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as total_cash,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Настя' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'Наличка Настя' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_nastya,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Лера' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'Наличка Лера' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_lera,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'Наличка Ваня' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'Наличка Ваня' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_vanya
    
  FROM public.financial_transactions;
$function$;