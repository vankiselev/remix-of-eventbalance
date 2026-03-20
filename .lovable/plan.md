

## Проблема

Ошибка: `null value in column "tenant_id" of relation "financial_transactions" violates not-null constraint`.

Колонка `tenant_id` обязательна (NOT NULL), но при создании транзакции значение `currentTenant?.id` может быть `null` (если тенант ещё не загрузился). Плюс в двух других местах `tenant_id` вообще не передаётся.

## Решение

### 1. `src/components/finance/TransactionFormNew.tsx`
- Строка 530: заменить `tenant_id: currentTenant?.id || null` на `tenant_id: currentTenant?.id`.
- Добавить проверку перед отправкой: если `currentTenant` не загружен — показать ошибку и не отправлять форму.

### 2. `src/components/FinancialTransaction.tsx`
- Добавить `useTenant()` и передавать `tenant_id: currentTenant?.id` в insert (строка ~121).
- Аналогичная проверка на наличие тенанта перед сабмитом.

### 3. `src/components/AdminReportsView.tsx`
- Добавить `useTenant()` и передавать `tenant_id: currentTenant?.id` в insert (строка ~190).

### Итого файлы
- `src/components/finance/TransactionFormNew.tsx`
- `src/components/FinancialTransaction.tsx`
- `src/components/AdminReportsView.tsx`

