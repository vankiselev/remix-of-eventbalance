

## Проблема

Хуки `useDescriptionChecker` и `useTransactionSuggestions` вызывают `supabase.functions.invoke(...)`, что отправляет запрос на self-hosted сервер (`superbag.eventbalance.ru`). Но edge-функции на self-hosted сервере не имеют `LOVABLE_API_KEY` для доступа к AI Gateway.

## Решение

Изменить только два хука, чтобы они вызывали AI edge-функции напрямую на Lovable Cloud через `fetch()`. Всё остальное (авторизация, данные, транзакции) продолжает работать через self-hosted сервер как раньше.

```text
Было:
  Браузер → supabase.functions.invoke() → self-hosted (нет AI ключа) → ❌

Станет:
  Браузер → fetch() → Lovable Cloud (есть AI ключ) → AI Gateway → ✅
  Браузер → supabase (всё остальное) → self-hosted → ✅
```

### Что меняется

**1. `src/hooks/useDescriptionChecker.ts`**
- Заменить `supabase.functions.invoke('check-transaction-description', ...)` на `fetch('https://aobbrgmuvkopkjijbejz.supabase.co/functions/v1/check-transaction-description', ...)`
- Передать anon key Lovable Cloud в заголовке `apikey`

**2. `src/hooks/useTransactionSuggestions.ts`**
- Аналогично — заменить `supabase.functions.invoke('suggest-transaction-fields', ...)` на `fetch()` на Lovable Cloud

**3. `supabase/functions/_shared/ai-proxy-client.ts`**
- Упростить: оставить только direct mode с `LOVABLE_API_KEY` из env (proxy mode больше не нужен)

**4. Удалить `supabase/functions/ai-proxy/index.ts`**
- Прокси-функция больше не нужна

### Что НЕ меняется

- Self-hosted сервер — остаётся как есть
- Авторизация — через self-hosted
- Все данные и транзакции — через self-hosted
- Файл `src/lib/supabase.ts` — без изменений

