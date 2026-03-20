

## Проблема

Два уведомления не работают:

1. **Админу о новой заявке**: Edge-функция `register-invited-user` ищет приглашение с `status = 'pending'`, но реальный статус в таблице `invitations` — `'sent'`. Из-за этого `invData = null`, и блок отправки уведомлений пропускается.

2. **Пользователю об одобрении**: В `PendingUsersManagement.tsx` после нажатия "Пригласить" отправляется email, но уведомление (запись в таблицу `notifications`) для пользователя не создается.

Дополнительно: avatar_url сохраняется как `http://kong:8000/...` (внутренний Docker URL) вместо публичного URL сервера.

## Решение

### 1. Исправить `register-invited-user` — фильтр статуса

**Файл: `supabase/functions/register-invited-user/index.ts`**

Строка 105: заменить `.eq("status", "pending")` на `.eq("status", "sent")`

### 2. Добавить уведомление пользователю при одобрении

**Файл: `src/components/admin/PendingUsersManagement.tsx`**

В `handleInviteUser`, после успешного обновления `invitation_status` и назначения роли, вставить уведомление:

```typescript
// После назначения роли (строка ~150)
await supabase.from("notifications").insert({
  user_id: user.id,
  title: "Доступ одобрен",
  message: "Ваш аккаунт активирован. Добро пожаловать в EventBalance!",
  type: "system",
});
```

### 3. Исправить avatar URL в edge function

**Файл: `supabase/functions/register-invited-user/index.ts`**

При формировании `publicUrl` использовать `supabaseUrl` (переменная окружения) вместо внутреннего URL, который возвращает `getPublicUrl()`:

```typescript
const { data: urlData } = adminClient.storage.from('avatars').getPublicUrl(fileName);
// Заменить внутренний host на публичный
finalAvatarUrl = urlData.publicUrl.replace(/http:\/\/kong:\d+/, supabaseUrl);
```

### 4. Деплой

Развернуть обновленный `register-invited-user`.

## Итого изменяемые файлы

- `supabase/functions/register-invited-user/index.ts` — фикс фильтра статуса + фикс avatar URL
- `src/components/admin/PendingUsersManagement.tsx` — добавить уведомление при одобрении

