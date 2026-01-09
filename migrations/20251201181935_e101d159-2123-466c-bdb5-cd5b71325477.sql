-- Функция для отключения триггера балансов (только для импорта)
CREATE OR REPLACE FUNCTION public.disable_balances_trigger_for_import()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Отключаем триггер пересчёта балансов
  ALTER TABLE financial_transactions DISABLE TRIGGER recalculate_balances_trigger;
  
  -- Логируем действие
  RAISE NOTICE 'Balance recalculation trigger disabled for import';
END;
$$;

-- Функция для включения триггера и пересчёта всех балансов
CREATE OR REPLACE FUNCTION public.enable_balances_trigger_and_recalculate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Включаем триггер обратно
  ALTER TABLE financial_transactions ENABLE TRIGGER recalculate_balances_trigger;
  
  -- Пересчитываем балансы для всех типов кассы
  PERFORM recalculate_balances_for_cash_type('Наличка Настя');
  PERFORM recalculate_balances_for_cash_type('Наличка Лера');
  PERFORM recalculate_balances_for_cash_type('Наличка Ваня');
  
  -- Логируем действие
  RAISE NOTICE 'Balance recalculation trigger enabled and all balances recalculated';
END;
$$;