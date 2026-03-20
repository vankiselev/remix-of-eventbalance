

## Фикс: приглашённый пользователь попадает в "Ожидание приглашения"

### Проблема

Edge-функция `register-invited-user` создаёт пользователя и добавляет в тенант, но не ставит `invitation_status = 'invited'` в таблице `profiles`. Триггер создания профиля ставит default значение `'pending'`. Из-за этого `AuthContext` считает пользователя неодобренным и перенаправляет на `/awaiting-invitation`.

### Решение

**1. Обновить `supabase/functions/register-invited-user/index.ts`**

В блоке обновления профиля добавить `invitation_status: 'invited'`:

```typescript
await adminClient.from("profiles").update({
  full_name: full_name || email,
  invitation_status: 'invited',  // <-- добавить
  invited_at: new Date().toISOString(),
}).eq("id", userId);
```

Одно изменение, один файл. После этого приглашённые пользователи будут сразу попадать в дашборд.

