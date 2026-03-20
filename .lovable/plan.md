

## Проблема

Ошибка: `null value in column "tenant_id" violates not-null constraint` при нажатии "Принять" на перевод денег.

**Корень**: функция `accept_money_transfer` создает зеркальную income-транзакцию, но **не включает `tenant_id`** в INSERT. Столбец `tenant_id` был добавлен позже (миграция `20260128`) с NOT NULL, а функция не обновлялась.

Из network logs видно точно:
```
Failing row contains (..., null).
message: null value in column "tenant_id" ... violates not-null constraint
```

## Решение

### 1. SQL миграция — обновить `accept_money_transfer`

Добавить `tenant_id` в INSERT, копируя его из исходной транзакции (`tx.tenant_id`):

```sql
INSERT INTO public.financial_transactions (
    created_by, operation_date, income_amount, expense_amount,
    category, cash_type, description, project_owner, static_project_name,
    transfer_from_user_id, linked_transaction_id,
    no_receipt, no_receipt_reason,
    tenant_id  -- <-- ДОБАВЛЯЕМ
) VALUES (
    auth.uid(), CURRENT_DATE, tx.expense_amount, 0,
    ...,
    tx.tenant_id  -- <-- ИЗ ОРИГИНАЛА
);
```

### 2. Никаких изменений в коде фронтенда

Проблема полностью на стороне SQL-функции. Фронтенд вызывает RPC корректно.

### Файлы
- **Новая SQL миграция**: `CREATE OR REPLACE FUNCTION accept_money_transfer` с `tenant_id`

