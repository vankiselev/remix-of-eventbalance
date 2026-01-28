
# План: Хранение секретов и настроек в базе данных

## Обзор решения

Вместо того чтобы хранить секреты (API ключи, URL и т.д.) в переменных окружения docker-compose.yml, мы создадим таблицу в базе данных, куда секреты будут добавлены через миграцию. Edge Functions будут читать их оттуда при каждом запросе.

## Как это будет работать

```text
┌─────────────────────┐
│   Edge Function     │
│  (send-invitation)  │
└──────────┬──────────┘
           │ 1. Запрос начинается
           ▼
┌─────────────────────┐
│  get_system_secret  │ ◄── Security Definer функция
│    (RPC вызов)      │
└──────────┬──────────┘
           │ 2. Получает значение по ключу
           ▼
┌─────────────────────┐
│   system_secrets    │
│      (таблица)      │
│  ─────────────────  │
│  key    │ value     │
│  ─────────────────  │
│  RESEND │ re_xxx    │
│  SITE   │ https://  │
└─────────────────────┘
           │
           │ 3. Возвращает значение
           ▼
┌─────────────────────┐
│   Edge Function     │
│  продолжает работу  │
│  с полученным ключом│
└─────────────────────┘
```

## Техническая реализация

### Фаза 1: Создание инфраструктуры в БД

**Миграция 1: Таблица и функции**

```sql
-- Таблица для хранения системных секретов
CREATE TABLE IF NOT EXISTS public.system_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS - только service_role может читать
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

-- Никакие обычные пользователи не могут читать напрямую
-- Доступ только через security definer функцию

-- Функция для получения секрета (вызывается из Edge Functions)
CREATE OR REPLACE FUNCTION public.get_system_secret(secret_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT value INTO secret_value
  FROM public.system_secrets
  WHERE key = secret_key;
  
  RETURN secret_value;
END;
$$;

-- Разрешить вызов функции только service_role
REVOKE ALL ON FUNCTION public.get_system_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_secret(TEXT) TO service_role;
```

**Миграция 2: Заполнение секретов**

```sql
-- Вставляем секреты (вам нужно заменить значения на реальные!)
INSERT INTO public.system_secrets (key, value, description) VALUES
  ('RESEND_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ для отправки email через Resend'),
  ('SITE_URL', 'https://eventbalance.ru', 'URL сайта для ссылок в письмах'),
  ('GOOGLE_AI_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ Google AI для транзакций'),
  ('CRON_SECRET', 'REPLACE_WITH_YOUR_SECRET', 'Секрет для защиты cron-функций'),
  ('GOOGLE_SHEETS_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ Google Sheets'),
  ('VAPID_PUBLIC_KEY', 'REPLACE_WITH_YOUR_KEY', 'VAPID публичный ключ для push'),
  ('VAPID_PRIVATE_KEY', 'REPLACE_WITH_YOUR_KEY', 'VAPID приватный ключ для push'),
  ('WEB_PUSH_CONTACT', 'mailto:admin@eventbalance.ru', 'Контакт для Web Push')
ON CONFLICT (key) DO NOTHING;
```

### Фаза 2: Обновление Edge Functions

Каждая Edge Function будет получать секреты из БД вместо `Deno.env.get()`:

```typescript
// Было:
const resendApiKey = Deno.env.get("RESEND_API_KEY");

// Станет:
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const { data: resendApiKey } = await supabase
  .rpc('get_system_secret', { secret_key: 'RESEND_API_KEY' });
```

### Какие секреты нужны для каждой функции

| Edge Function | Требуемые секреты |
|--------------|-------------------|
| send-invitation-email | RESEND_API_KEY, SITE_URL |
| send-password-reset | RESEND_API_KEY, SITE_URL |
| suggest-transaction-fields | GOOGLE_AI_API_KEY |
| check-transaction-description | GOOGLE_AI_API_KEY |
| voice-transaction | GOOGLE_AI_API_KEY |
| sync-google-sheets | GOOGLE_SHEETS_API_KEY |
| send-push-notification | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, WEB_PUSH_CONTACT |
| birthday-notifications | CRON_SECRET |
| overdue-reports-check | CRON_SECRET |
| warehouse-notifications | CRON_SECRET |

### Важные переменные, которые ОСТАНУТСЯ в docker-compose

Эти переменные **нельзя** перенести в БД, т.к. они нужны для подключения к самой БД:

- `SUPABASE_URL` - URL для подключения к Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - ключ для подключения с полными правами  
- `SUPABASE_ANON_KEY` - публичный ключ

## Преимущества подхода

1. **Централизованное управление** - все секреты в одном месте
2. **Миграции через Git** - вы контролируете значения через код
3. **Нет дублирования** - не нужно синхронизировать docker-compose и код
4. **Безопасность** - секреты защищены RLS, доступ только через service_role
5. **Простота обновления** - изменили в БД, все функции сразу используют новое значение

## Недостатки и риски

1. **Дополнительный запрос к БД** - каждая функция делает +1 запрос (минимальный overhead)
2. **Секреты в миграциях** - в файле миграции будут реальные ключи (нужна осторожность с Git)
3. **Зависимость от БД** - если БД недоступна, функции не получат секреты

## Альтернативный подход: Секреты вне миграций

Если вы не хотите хранить реальные значения секретов в Git, можно:

1. Создать миграцию только со структурой (таблица + функция)
2. Вручную заполнить секреты через SQL в Supabase Dashboard

## Порядок выполнения

1. Создать миграцию с таблицей `system_secrets` и функцией `get_system_secret`
2. Создать отдельную миграцию с заполнением секретов (или сделать вручную)
3. Обновить все 17 Edge Functions для чтения секретов из БД
4. Протестировать работу функций
5. Удалить переменные окружения из docker-compose (кроме SUPABASE_*)
