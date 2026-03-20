

## Проблема

AI-функции (проверка орфографии и автоподбор категории/проекта) не работают из-за сложной прокси-архитектуры, которая сломана:

1. Edge-функции `check-transaction-description` и `suggest-transaction-fields` вызывают `callAIProxy()` из `_shared/ai-proxy-client.ts`
2. `ai-proxy-client.ts` пытается получить секреты `LOVABLE_CLOUD_URL` и `AI_PROXY_KEY` из таблицы `system_secrets`
3. **Этих секретов нет в таблице** — там только `RESEND_API_KEY`, `VAPID_*`, `CRON_SECRET`
4. Без них клиент возвращает `null`, и функции падают с ошибкой "AI proxy not configured"

## Решение — упростить архитектуру

Все edge-функции деплоятся на Lovable Cloud, где уже есть `LOVABLE_API_KEY`. Прокси-цепочка (self-hosted → ai-proxy → AI Gateway) избыточна. Нужно убрать промежуточное звено и вызывать AI Gateway напрямую.

### Шаг 1: Переписать `_shared/ai-proxy-client.ts`

Заменить логику получения секретов из БД на прямой вызов `LOVABLE_API_KEY` из env. Вместо `fetch(proxyUrl/functions/v1/ai-proxy)` вызывать `https://ai.gateway.lovable.dev/v1/chat/completions` напрямую:

- Убрать `getSecrets()` и зависимость от `system_secrets`
- Использовать `Deno.env.get("LOVABLE_API_KEY")` 
- Вызывать gateway напрямую с `Authorization: Bearer ${LOVABLE_API_KEY}`
- Модель: `google/gemini-3-flash-preview`

### Шаг 2: Удалить `ai-proxy` edge function

Функция `ai-proxy/index.ts` больше не нужна — она была промежуточным звеном. Удалить её.

### Шаг 3: Убрать `_shared/secrets.ts` (если больше не используется)

Проверить, используется ли где-то ещё, и удалить если нет.

### Шаг 4: Задеплоить и протестировать

- Задеплоить обновлённые `check-transaction-description` и `suggest-transaction-fields`
- Протестировать вызовом curl

### Результат

Обе AI-функции (орфография + автоподбор) заработают, архитектура упростится с 3 звеньев до 2 (edge function → AI Gateway).

