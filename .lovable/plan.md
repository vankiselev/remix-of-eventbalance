

## Проблема

Аватар, загруженный при регистрации, не отображается в профиле. Наиболее вероятная причина: миграция `20260320_fix_handle_new_user_profile_fields.sql` упала на self-hosted сервере (об этом говорил ранее workflow #22). Это значит, что триггер `handle_new_user` на self-hosted — **старая версия**, которая не читает `avatar_url` из `user_metadata`.

Даже если триггер починить — нет гарантии, что он отработает сразу. Надёжнее добавить **явный UPDATE профиля** в edge function после создания пользователя.

## Решение

### 1. Edge function: явно обновлять avatar_url в profiles

**Файл: `supabase/functions/register-invited-user/index.ts`**

После создания пользователя (строка ~90) добавить явный UPDATE avatar_url, phone, birth_date в profiles через `adminClient` (service role обходит RLS):

```typescript
// After user creation, explicitly update profile fields
// This is a safety net in case the trigger doesn't extract all metadata
if (finalAvatarUrl || phone || birth_date) {
  const profileUpdate: Record<string, any> = {};
  if (finalAvatarUrl) profileUpdate.avatar_url = finalAvatarUrl;
  if (phone) profileUpdate.phone = phone;
  if (birth_date) profileUpdate.birth_date = birth_date;
  
  await adminClient.from("profiles")
    .update(profileUpdate)
    .eq("id", userId);
}
```

Это обходит проблему с триггером и с `prevent_unauthorized_profile_updates` (service role не блокируется).

### 2. Миграция: обновить handle_new_user для self-hosted

**Файл: `migrations/20260320_fix_handle_new_user_profile_fields.sql`**

Убрать ссылки на колонки, которых может не быть на self-hosted (`invitation_status`, `invited_at`, `invited_by`, `role`), чтобы миграция не падала. Сделать INSERT более безопасным — только с колонками, которые точно существуют.

### 3. Деплой

Развернуть обновлённый `register-invited-user`.

## Итого изменяемые файлы

- `supabase/functions/register-invited-user/index.ts` — добавить явный UPDATE avatar_url/phone/birth_date
- `migrations/20260320_fix_handle_new_user_profile_fields.sql` — сделать совместимым с self-hosted

