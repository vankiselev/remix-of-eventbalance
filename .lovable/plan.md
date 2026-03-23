

## Проблема

Карточки "Наличка Настя/Лера/Ваня" показывают **0 ₽**, хотя "Итого на руках" показывает **1 000 ₽**. Это значит, что транзакции находятся (фильтр по `created_by` работает), но `cash_type` не совпадает с ожидаемыми значениями в CASE-выражениях функции.

**Две возможные причины:**

1. **На self-hosted сервере работает старая версия функции** `calculate_user_cash_totals` (из миграции 20251013), где `total_cash = SUM(всё)`, а не `SUM(три кошелька)`. В новой версии (миграция 20251017) `total_cash = cash_nastya + cash_lera + cash_vanya`, и если бы она была на сервере, total тоже был бы 0.

2. **Значение `cash_type` в транзакции** не совпадает со строками `'Наличка Настя'` / `'Наличка Лера'` / `'Наличка Ваня'` — возможно там другой формат, пробелы, или значение из другого кошелька (Корп. карта, ИП и т.д.).

## План исправления

### 1. Обновить функции подсчёта — учитывать ВСЕ типы кошельков

Сейчас функции считают только 3 "наличных" кошелька. Но `cash_type` может быть любым значением из `PROJECT_OWNERS` (всего 12 вариантов: Корп. карта, ИП, Оплатил клиент и т.д.). Нужно:

- Оставить 3 карточки для наличных кошельков
- **Пересчитать `total_cash`** как сумму ВСЕХ транзакций пользователя (не только трёх наличных), чтобы "Итого на руках" отражало полный баланс

**Новая миграция** — пересоздать `calculate_user_cash_totals`, `get_company_cash_summary` и `get_employee_cash_summary`:
- `total_cash` = SUM по всем транзакциям (без фильтра по cash_type)
- `cash_nastya/lera/vanya` = SUM с фильтром по конкретному cash_type (как сейчас)

### 2. Добавить нечувствительное к регистру/пробелам сравнение

Использовать `TRIM(LOWER(cash_type))` для сравнения в CASE-выражениях, чтобы избежать проблем с невидимыми символами или разным регистром.

### 3. Без изменений фронтенда

Компоненты `FinanceSummaryCards` и хуки уже работают корректно — проблема только в SQL-функциях на сервере.

## Технические детали

Миграция обновит 3 функции:

```sql
-- Пример для calculate_user_cash_totals
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(COALESCE(income_amount,0) - COALESCE(expense_amount,0)), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Настя' THEN ... END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Лера'  THEN ... END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN TRIM(cash_type) = 'Наличка Ваня'  THEN ... END), 0) AS cash_vanya
  FROM public.financial_transactions
  WHERE created_by = user_uuid;
$$;
```

Аналогично для `get_company_cash_summary` (без WHERE) и `get_employee_cash_summary`.

