
# План: Исправление отправки приглашений с tenant_id

## Проблема
При отправке приглашения новому сотруднику возникает ошибка:
```
null value in column "tenant_id" of relation "invitations" violates not-null constraint
```

Таблица `invitations` требует обязательное поле `tenant_id`, но код в `InviteUserDialog` не передаёт это значение при создании приглашения.

## Решение
Обновить компонент `InviteUserDialog`, чтобы он:
1. Использовал хук `useTenant()` для получения текущего тенанта
2. Передавал `tenant_id` при вставке записи в таблицу `invitations`
3. Проверял наличие активного тенанта перед отправкой приглашения

## Технические изменения

### Файл: src/components/admin/InviteUserDialog.tsx

1. Добавить импорт `useTenant`:
```typescript
import { useTenant } from "@/contexts/TenantContext";
```

2. Получить `currentTenant` в компоненте:
```typescript
const { currentTenant } = useTenant();
```

3. Добавить проверку наличия тенанта в начале функции `onSubmit`:
```typescript
if (!currentTenant) {
  toast({
    title: "Ошибка",
    description: "Не выбрана компания для приглашения",
    variant: "destructive",
  });
  return;
}
```

4. Добавить `tenant_id` в запрос на вставку приглашения (строка 85):
```typescript
.insert({
  email: data.email,
  role: 'employee',
  first_name: data.firstName || null,
  last_name: data.lastName || null,
  invited_by: (await supabase.auth.getUser()).data.user?.id!,
  token_hash: '',
  tenant_id: currentTenant.id,  // Добавить эту строку
})
```
