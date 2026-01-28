
# Миграция Edge Functions с Lovable AI Gateway на Google AI API

## Текущая ситуация

Три Edge Functions используют Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`):
- `check-transaction-description` - проверка орфографии/грамматики
- `suggest-transaction-fields` - автоподбор категории и проекта
- `voice-transaction` - парсинг голосовых команд

Поскольку проект использует self-hosted Supabase сервер, `LOVABLE_API_KEY` недоступен - этот ключ работает только на инфраструктуре Lovable.

---

## Решение

Переключить все Edge Functions на прямой Google AI API (Gemini).

---

## Необходимые действия

### 1. Получить API ключ Google AI

1. Перейти на https://aistudio.google.com/apikey
2. Создать новый API ключ для Gemini
3. Добавить ключ в секреты Supabase:
   ```bash
   supabase secrets set GOOGLE_AI_API_KEY=your_api_key_here
   ```

### 2. Изменения в Edge Functions

Все функции используют одинаковый паттерн:
- **Заменить URL**: `https://ai.gateway.lovable.dev/v1/chat/completions` на `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Заменить ключ**: `LOVABLE_API_KEY` на `GOOGLE_AI_API_KEY`
- **Адаптировать формат запроса и ответа**

---

## Техническая информация

### Формат запроса - до (Lovable AI Gateway)
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
  }),
});

const data = await response.json();
const content = data.choices?.[0]?.message?.content;
```

### Формат запроса - после (Google AI API)
```typescript
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
  }
);

const data = await response.json();
const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
```

### Tool Calling (для check-transaction-description)
```typescript
body: JSON.stringify({
  systemInstruction: { parts: [{ text: systemPrompt }] },
  contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  tools: [{
    functionDeclarations: [{
      name: "report_text_corrections",
      description: "Report spelling and grammar corrections",
      parameters: {
        type: "OBJECT",
        properties: {
          has_errors: { type: "BOOLEAN" },
          corrected_text: { type: "STRING" },
          errors: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                original: { type: "STRING" },
                correction: { type: "STRING" },
                type: { type: "STRING" }
              }
            }
          }
        },
        required: ["has_errors", "corrected_text", "errors"]
      }
    }]
  }],
  toolConfig: { functionCallingConfig: { mode: "ANY" } }
})

// Извлечение результата
const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
const result = functionCall?.args;
```

---

## Изменяемые файлы

### 1. `supabase/functions/check-transaction-description/index.ts`
- Заменить Lovable AI Gateway на Google AI API
- Адаптировать tool calling под формат Gemini

### 2. `supabase/functions/suggest-transaction-fields/index.ts`
- Заменить URL и формат запроса
- Адаптировать парсинг ответа

### 3. `supabase/functions/voice-transaction/index.ts`
- Заменить 4 места с вызовами AI API:
  - Simple mode parsing (строки ~332-357)
  - Step 1 parsing (строки ~489-524)
  - Step 2 project search (строки ~620-647)
  - Возможно step 3 если есть AI вызовы

---

## Преимущества Google AI API

| Параметр | Lovable AI Gateway | Google AI API |
|----------|-------------------|---------------|
| Доступность | Только Lovable infra | Любой сервер |
| Модель | gemini-2.5-flash | gemini-2.0-flash (новее) |
| Бесплатный лимит | Через кредиты Lovable | 15 RPM, 1M токенов/мин бесплатно |
| Контроль | Через Lovable | Прямой доступ |

---

## Пошаговый процесс

1. Создать Google AI API ключ на https://aistudio.google.com/apikey
2. Добавить секрет в Supabase: `supabase secrets set GOOGLE_AI_API_KEY=...`
3. Обновить три Edge Functions с новым форматом API
4. Задеплоить функции: `supabase functions deploy`
5. Протестировать функционал

---

## Важно

После добавления API ключа сообщи мне, и я обновлю все три Edge Functions.
