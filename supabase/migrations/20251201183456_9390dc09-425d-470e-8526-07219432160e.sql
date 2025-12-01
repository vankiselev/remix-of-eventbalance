-- Обновляем функцию enable_balances_trigger_and_recalculate для динамического пересчёта всех типов кошельков
CREATE OR REPLACE FUNCTION public.enable_balances_trigger_and_recalculate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cash_type TEXT;
BEGIN
  -- Включаем триггер обратно
  ALTER TABLE financial_transactions ENABLE TRIGGER recalculate_balances_trigger;
  
  -- Пересчитываем балансы для ВСЕХ уникальных cash_type из базы
  FOR v_cash_type IN 
    SELECT DISTINCT cash_type 
    FROM financial_transactions 
    WHERE cash_type IS NOT NULL
  LOOP
    PERFORM recalculate_balances_for_cash_type(v_cash_type);
    RAISE NOTICE 'Recalculated balances for: %', v_cash_type;
  END LOOP;
  
  RAISE NOTICE 'Balance recalculation trigger enabled and all balances recalculated';
END;
$$;