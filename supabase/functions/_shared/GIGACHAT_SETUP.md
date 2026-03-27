# GigaChat Integration Setup

## 1. Получение ключей

1. Зарегистрируйтесь на [developers.sber.ru](https://developers.sber.ru/).
2. Создайте проект → получите **Client ID** и **Client Secret**.
3. Выберите тарифный план (для начала: `GIGACHAT_API_PERS`).

## 2. Настройка секретов

Добавьте секреты в таблицу `system_secrets` (или через Supabase Secrets):

```sql
INSERT INTO system_secrets (key, value) VALUES ('GIGACHAT_CLIENT_ID', 'ваш-client-id');
INSERT INTO system_secrets (key, value) VALUES ('GIGACHAT_CLIENT_SECRET', 'ваш-client-secret');
```

Или установите переменные окружения для Edge Functions:

| Переменная | Обязательна | Описание | По умолчанию |
|---|---|---|---|
| `GIGACHAT_CLIENT_ID` | ✅ | Client ID из developers.sber.ru | — |
| `GIGACHAT_CLIENT_SECRET` | ✅ | Client Secret | — |
| `GIGACHAT_SCOPE` | ❌ | OAuth scope | `GIGACHAT_API_PERS` |
| `GIGACHAT_BASE_URL` | ❌ | Базовый URL API | `https://gigachat.devices.sberbank.ru` |
| `GIGACHAT_MODEL` | ❌ | Модель | `GigaChat` |
| `GIGACHAT_TIMEOUT_MS` | ❌ | Таймаут запроса (мс) | `20000` |

### Scope варианты
- `GIGACHAT_API_PERS` — физлица (бесплатный тариф)
- `GIGACHAT_API_B2B` — юрлица
- `GIGACHAT_API_CORP` — корпоративный (on-premise)

## 3. Smoke-тест

### Успешный ответ
```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/check-transaction-description \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"text": "такси до площадки"}'
```
Ожидаемый ответ: `{"has_errors": false, "corrected_text": "Такси до площадки", "errors": [...]}`

### Ошибка авторизации
Если `GIGACHAT_CLIENT_ID` / `GIGACHAT_CLIENT_SECRET` неверны:
```json
{"error": "GigaChat auth error: 401"}
```

### Таймаут
Если GigaChat не отвечает в течение `GIGACHAT_TIMEOUT_MS`:
```json
{"error": "GigaChat request timed out. Please try again."}
```

## 4. Деплой в production

1. Установите секреты в `.env` Docker-контейнера или в Supabase Secrets.
2. Задеплойте Edge Functions (автоматически через GitHub Actions).
3. Проверьте smoke-test выше.
4. Мониторьте логи Edge Functions на ошибки `[gigachat]`.

## 5. Архитектура

```
Frontend → Edge Function → ai-proxy-client.ts → GigaChat OAuth → GigaChat API
                                                   ↑
                                          Token cache (in-memory, 30 min TTL)
```

Lovable AI Gateway (`ai.gateway.lovable.dev`) **полностью удалён** из цепочки.
