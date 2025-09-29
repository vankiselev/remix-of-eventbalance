-- Fix user cash calculation functions to properly match Russian cash type values
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid uuid)
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
    
  FROM public.financial_transactions
  WHERE created_by = user_uuid;
$function$;

-- Fix employee cash summary function
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
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
    
  FROM public.financial_transactions
  WHERE created_by = employee_user_id;
$function$;