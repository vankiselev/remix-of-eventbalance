BEGIN;

-- Recompute company summary: total excludes transfers, per-wallet includes all
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH tx AS (
    SELECT 
      COALESCE(income_amount,0) - COALESCE(expense_amount,0) AS delta,
      cash_type,
      category
    FROM public.financial_transactions
  )
  SELECT 
    -- Exclude internal transfers from total company cash
    COALESCE(SUM(CASE WHEN category = 'Передано или получено от Леры/Насти/Вани' THEN 0 ELSE delta END), 0) AS total_cash,
    -- Per wallet should include transfers
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Настя' THEN delta ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Лера' THEN delta ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Ваня' THEN delta ELSE 0 END), 0) AS cash_vanya
  FROM tx;
$function$;

-- Recompute user summary: same rule (exclude transfers from total only)
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid uuid)
 RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH tx AS (
    SELECT 
      COALESCE(income_amount,0) - COALESCE(expense_amount,0) AS delta,
      cash_type,
      category
    FROM public.financial_transactions
    WHERE created_by = user_uuid
  )
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Передано или получено от Леры/Насти/Вани' THEN 0 ELSE delta END), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Настя' THEN delta ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Лера' THEN delta ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN cash_type = 'Наличка Ваня' THEN delta ELSE 0 END), 0) AS cash_vanya
  FROM tx;
$function$;

COMMIT;