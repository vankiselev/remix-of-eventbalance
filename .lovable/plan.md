
# План: Гибридная архитектура Lovable AI + Self-hosted Supabase

## Проблема
Self-hosted Supabase не имеет доступа к Lovable AI Gateway. Ключ `LOVABLE_API_KEY` автоматически предоставляется только в Lovable Cloud.

## Решение
Создать **AI-прокси Edge Function** на Lovable Cloud, которую будет вызывать твой self-hosted Supabase.

```text
┌─────────────────┐    ┌───────────────────────┐    ┌─────────────────────┐
│    Frontend     │───>│  Self-hosted Supabase │───>│    Lovable Cloud    │
│                 │    │   (твоя база/auth)    │    │   (AI Gateway)      │
└─────────────────┘    └───────────────────────┘    └─────────────────────┘
                              │                              │
                              ▼                              ▼
                       База данных                   Lovable AI Gateway
                       Аутентификация               (LOVABLE_API_KEY auto)
                       Бизнес-логика                 google/gemini-3-flash
```

---

## Как это работает

### Шаг 1: Lovable Cloud AI Proxy

Создаём **одну** Edge Function на Lovable Cloud:

**`supabase/functions/ai-proxy/index.ts`** (деплоится на Lovable Cloud)

```typescript
// Принимает запросы от self-hosted Supabase
// Проксирует их в Lovable AI Gateway
// Возвращает ответ обратно

POST /ai-proxy
Body: {
  action: "check-description" | "suggest-fields" | "parse-voice",
  payload: { ... }
}
```

### Шаг 2: Self-hosted функции вызывают прокси

Твои Edge Functions на self-hosted Supabase будут вызывать Lovable Cloud:

```typescript
// Вместо:
const response = await fetch('https://generativelanguage.googleapis.com/...')

// Станет:
const response = await fetch('https://<lovable-project>.supabase.co/functions/v1/ai-proxy', {
  body: { action: 'check-description', payload: { text, category } }
})
```

### Шаг 3: Секрет для авторизации между серверами

В `system_secrets` добавляем ключ `LOVABLE_AI_PROXY_KEY` — это будет секрет для авторизации запросов от твоего Supabase к Lovable Cloud.

---

## Техническая реализация

### 1. Включаем Lovable Cloud
Это активирует `LOVABLE_API_KEY` и позволит деплоить AI-прокси функцию.

### 2. Создаём AI-прокси функцию на Lovable Cloud

```text
supabase/functions/
  ai-proxy/
    index.ts   ← Деплоится ТОЛЬКО на Lovable Cloud
```

Функция:
- Проверяет секретный ключ в заголовке `X-AI-Proxy-Key`
- Проксирует запрос в `https://ai.gateway.lovable.dev/v1/chat/completions`
- Поддерживает все 3 действия: check-description, suggest-fields, parse-voice

### 3. Обновляем self-hosted функции

Заменяем прямые вызовы Google AI на вызовы AI-прокси:

**`check-transaction-description/index.ts`**:
```typescript
// Было: fetch('https://generativelanguage.googleapis.com/...')
// Стало:
const response = await callAIProxy('check-description', { text, category });
```

### 4. Shared helper для вызова прокси

**`_shared/ai-proxy.ts`**:
```typescript
export async function callAIProxy(action: string, payload: any) {
  const LOVABLE_CLOUD_URL = await getSystemSecret('LOVABLE_CLOUD_URL');
  const AI_PROXY_KEY = await getSystemSecret('AI_PROXY_KEY');
  
  const response = await fetch(`${LOVABLE_CLOUD_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Proxy-Key': AI_PROXY_KEY
    },
    body: JSON.stringify({ action, payload })
  });
  
  return response.json();
}
```

---

## Что нужно настроить

### В system_secrets (твой Supabase):
| Ключ | Значение |
|------|----------|
| `LOVABLE_CLOUD_URL` | URL твоего Lovable Cloud проекта |
| `AI_PROXY_KEY` | Секретный ключ для авторизации (генерируем) |

### В Lovable Cloud Secrets:
| Ключ | Значение |
|------|----------|
| `AI_PROXY_KEY` | Тот же секретный ключ |

---

## Преимущества

1. **Не нужен Google AI API key** — используем Lovable AI Gateway бесплатно
2. **Единая точка входа** — одна прокси-функция для всех AI-запросов
3. **Твоя база остаётся на self-hosted** — данные не уходят в Lovable Cloud
4. **Просто масштабировать** — добавить новое AI-действие = добавить кейс в прокси

---

## План работ

1. Включить Lovable Cloud
2. Создать `ai-proxy` Edge Function на Lovable Cloud
3. Создать `_shared/ai-proxy.ts` helper на self-hosted Supabase
4. Обновить 3 AI-функции:
   - `check-transaction-description`
   - `suggest-transaction-fields`
   - `voice-transaction`
5. Добавить секреты в обе системы
6. Задеплоить и протестировать

---

## Альтернатива (если не хочешь Lovable Cloud)

Можно сделать проще — добавить OpenAI API key в `system_secrets` и использовать OpenAI API напрямую. Это один ключ, $5-10/месяц, работает стабильно.
