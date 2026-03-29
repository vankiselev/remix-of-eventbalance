# GigaChat Integration Setup

## 1. Получение ключей

1. Зарегистрируйтесь на [developers.sber.ru](https://developers.sber.ru/).
2. Создайте проект → получите **Client ID** и **Client Secret**.
3. Выберите тарифный план (для начала: `GIGACHAT_API_PERS`).

## 2. Настройка секретов

Добавьте секреты в таблицу `system_secrets`:

```sql
INSERT INTO system_secrets (key, value) VALUES ('GIGACHAT_CLIENT_ID', 'ваш-client-id');
INSERT INTO system_secrets (key, value) VALUES ('GIGACHAT_CLIENT_SECRET', 'ваш-client-secret');
```

| Переменная | Обязательна | Описание | По умолчанию |
|---|---|---|---|
| `GIGACHAT_CLIENT_ID` | ✅ | Client ID из developers.sber.ru | — |
| `GIGACHAT_CLIENT_SECRET` | ✅ | Client Secret (см. форматы ниже) | — |
| `GIGACHAT_SCOPE` | ❌ | OAuth scope | `GIGACHAT_API_PERS` |
| `GIGACHAT_BASE_URL` | ❌ | Базовый URL API | `https://gigachat.devices.sberbank.ru` |
| `GIGACHAT_MODEL` | ❌ | Модель | `GigaChat` |
| `GIGACHAT_TIMEOUT_MS` | ❌ | Таймаут запроса (мс) | `20000` |

### Форматы `GIGACHAT_CLIENT_SECRET`

Поддерживаются два формата:

**a) Raw Client Secret** — обычный секрет из developers.sber.ru:
```
ваш-client-secret-строка
```
Клиент сам выполнит `base64(client_id:client_secret)` при OAuth-запросе.

**b) Готовый base64 auth key** — поле «Авторизационные данные» из developers.sber.ru:
```
ZDg4M2...base64...строка==
```
Это уже `base64(client_id:client_secret)`. Клиент определит формат автоматически и не будет кодировать повторно.

### Scope варианты
- `GIGACHAT_API_PERS` — физлица (бесплатный тариф)
- `GIGACHAT_API_B2B` — юрлица
- `GIGACHAT_API_CORP` — корпоративный (on-premise)

## 3. Smoke-тест

### Успешный ответ
```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/analyze-transaction-description \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"description": "такси до площадки"}'
```
Ожидаемый ответ: `{"success": true, "corrected_text": "Такси до площадки", "has_errors": false, "category": "Доставка / Трансфер / Парковка / Вывоз мусора", "confidence": 0.9, ...}`

### Ошибка авторизации
Если ключи неверны:
```json
{"error": "GigaChat auth error: 401"}
```

### Таймаут
Если GigaChat не отвечает:
```json
{"error": "GigaChat request timed out. Please try again."}
```

## 4. Troubleshooting

### `UnknownIssuer` / TLS error
GigaChat API использует сертификаты Минцифры РФ. Клиент включает Russian Trusted Root CA и Sub CA через `Deno.createHttpClient({ caCerts })`. Если ошибка сохраняется — проверьте, что файл `russian-ca-certs.ts` не был удалён.

### `Can't decode Authorization header` / 400
Двойное base64-кодирование. Если `GIGACHAT_CLIENT_SECRET` уже содержит готовый ключ «Авторизационные данные» (base64), клиент определяет это автоматически. Если ошибка повторяется — проверьте, что секрет не содержит лишних кавычек или пробелов.

### 401 Unauthorized
- Неверные `GIGACHAT_CLIENT_ID` / `GIGACHAT_CLIENT_SECRET`.
- Истёк токен — клиент автоматически сбрасывает кеш и запрашивает новый.
- Проверьте, что scope (`GIGACHAT_API_PERS` / `B2B` / `CORP`) соответствует вашему тарифу.

### 429 Too Many Requests
Превышен лимит запросов тарифного плана. Подождите или смените тариф.

### Timeout
По умолчанию 20 секунд. Увеличьте `GIGACHAT_TIMEOUT_MS` при необходимости.

## 5. Архитектура

```
Frontend → Edge Function → ai-proxy-client.ts → GigaChat OAuth → GigaChat API
                                                   ↑
                                          Token cache (in-memory, 30 min TTL)
```

Lovable AI Gateway (`ai.gateway.lovable.dev`) **полностью удалён** из цепочки.

## 6. Деплой

1. Добавьте секреты в `system_secrets`.
2. Edge Functions деплоятся автоматически через GitHub Actions.
3. Проверьте smoke-test выше.
4. Мониторьте логи Edge Functions — теги `[gigachat-oauth]` и `[gigachat]`.
