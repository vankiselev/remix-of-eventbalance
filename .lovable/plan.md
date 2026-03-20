

## Проблема

При регистрации по приглашению данные (ФИО, телефон, дата рождения, аватар) не сохраняются в профиле. Две причины:

1. **Триггер блокирует обновление профиля** — в edge function `register-invited-user` используется `adminClient` (service role), но триггер `prevent_unauthorized_profile_updates` проверяет `auth.uid()`, который для service role равен NULL. Триггер выбрасывает исключение, и UPDATE не применяется.

2. **Аватар не загружается** — на странице `/invite` пользователь ещё не авторизован, а storage policy требует `auth.uid()` для загрузки. Upload тихо падает.

## Решение

### 1. Передавать данные через user_metadata при создании пользователя

Вместо отдельного UPDATE после создания, передавать все поля (first_name, last_name, middle_name, phone, birth_date) в `user_metadata` при вызове `auth.admin.createUser`. Триггер `handle_new_user` уже читает из `raw_user_meta_data` — нужно расширить его, чтобы он также подхватывал phone, birth_date.

**Файл: `migrations/` — новая миграция для обновления `handle_new_user`**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() ...
  -- добавить: phone, birth_date, avatar_url из raw_user_meta_data
```

**Файл: `supabase/functions/register-invited-user/index.ts`**
- Передать все поля в `user_metadata` при `createUser` (first_name, last_name, middle_name, phone, birth_date, avatar_url)
- Убрать отдельный `profiles.update()` — данные будут вставлены триггером
- Оставить `invitation_status` update отдельно (через adminClient, с обработкой ошибки)

### 2. Перенести загрузку аватара в edge function

Сейчас InvitePage пытается загрузить аватар через `supabase.storage` без авторизации — это не работает.

**Файл: `supabase/functions/register-invited-user/index.ts`**
- Принимать аватар как base64 в теле запроса
- Загружать через `adminClient.storage` (обходит RLS)
- Возвращать publicUrl и сохранять в user_metadata

**Файл: `src/pages/InvitePage.tsx`**
- Вместо прямой загрузки в storage, конвертировать файл в base64 и передать в edge function

### 3. Обновить триггер handle_new_user

Расширить триггер для чтения дополнительных полей из metadata:

```sql
-- В INSERT VALUES добавить:
phone = COALESCE(raw_meta ->> 'phone', NULL),
birth_date = (raw_meta ->> 'birth_date')::date,
avatar_url = COALESCE(raw_meta ->> 'avatar_url', NULL),
invitation_status = 'invited'  -- для приглашённых
```

### 4. Деплой

Развернуть обновлённый `register-invited-user`.

## Итого изменяемые файлы

- `supabase/functions/register-invited-user/index.ts` — передача данных через metadata + загрузка аватара на сервере
- `src/pages/InvitePage.tsx` — передача аватара как base64 вместо прямого upload
- Новая миграция SQL — обновление `handle_new_user` для чтения phone, birth_date, avatar_url

