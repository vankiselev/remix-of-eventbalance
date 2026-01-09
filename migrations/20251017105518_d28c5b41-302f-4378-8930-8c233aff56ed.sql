-- Обновляем функцию подсчета остатков пользователя - учитываем только наличные кошельки
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid uuid)
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH sums AS (
    SELECT 
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
    FROM public.financial_transactions
    WHERE created_by = user_uuid
  )
  SELECT 
    (cash_nastya + cash_lera + cash_vanya) AS total_cash,
    cash_nastya,
    cash_lera,
    cash_vanya
  FROM sums;
$function$;

-- Обновляем функцию подсчета остатков компании - учитываем только наличные кошельки
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH sums AS (
    SELECT 
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Настя' THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_nastya,
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Лера'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_lera,
      COALESCE(SUM(CASE WHEN cash_type = 'Наличка Ваня'  THEN COALESCE(income_amount,0) - COALESCE(expense_amount,0) ELSE 0 END), 0) AS cash_vanya
    FROM public.financial_transactions
  )
  SELECT 
    (cash_nastya + cash_lera + cash_vanya) AS total_cash,
    cash_nastya,
    cash_lera,
    cash_vanya
  FROM sums;
$function$;

-- Обновляем функцию подсчета остатков сотрудника - учитываем только наличные кошельки
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;