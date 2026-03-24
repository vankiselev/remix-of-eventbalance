

## Причина ошибки

Миграция `get_invitation_by_token` **не была применена** на self-hosted сервере из-за неправильного имени файла (`20250323171100_fix_get_invitation_by_token.sql` — год 2025, нет UUID). Поэтому на self-hosted до сих пор работает старая версия RPC с типом параметра `uuid`, которая не находит токен (тип `text`).

Fallback через прямой запрос к таблице тоже не работает, потому что пользователь на странице `/invite` **не аутентифицирован**, а RLS на таблице `invitations` требует `is_tenant_member(tenant_id)`.

Итого: оба пути валидации токена молча возвращают пустой результат → "Приглашение не найдено".

## План исправления

### Шаг 1: Переименовать миграцию
Удалить `migrations/20250323171100_fix_get_invitation_by_token.sql` и создать новый файл с корректным именем по конвенции `[timestamp]_[uuid].sql` (год 2026), содержащий тот же SQL:

```sql
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(id uuid, email text, role text, expires_at timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;
```

### Шаг 2: Добавить RLS policy для анонимного доступа к приглашениям по токену
Добавить в ту же миграцию SELECT-политику для `anon` роли на таблице `invitations`, чтобы fallback-запрос работал для неаутентифицированных пользователей (ограниченно — только по токену и статусу):

```sql
CREATE POLICY "Anon can read invitations by token"
ON public.invitations FOR SELECT TO anon
USING (status IN ('pending', 'sent', 'accepted'));
```

Это не утечка данных — таблица и так не содержит секретов, а токен передаётся через URL.

### Файлы для изменения
1. Удалить `migrations/20250323171100_fix_get_invitation_by_token.sql`
2. Создать `migrations/20260323181000_[uuid].sql` с объединённым SQL (RPC + RLS policy)

