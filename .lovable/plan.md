
# План: Исправление выбора тенанта для legacy маршрутов

## Проблема
При переходе на страницу `/administration` (legacy маршрут без tenant slug в URL) система не может определить текущий тенант:
- URL `/administration` не содержит slug тенанта
- `TenantContext` возвращает `currentTenant = null`
- Приглашения не могут быть отправлены без `tenant_id`

## Причина
В `TenantContext.tsx` на строках 168-173 логика автовыбора тенанта:
```typescript
} else if (memberships.length === 1 && memberships[0].tenant) {
  // Auto-select if user has only one tenant
  setCurrentTenantState(memberships[0].tenant);
} else {
  setCurrentTenantState(null);
}
```

Проблемы:
1. Автовыбор работает только при ровно 1 членстве
2. `last_tenant_slug` сохраняется в localStorage, но НЕ восстанавливается при загрузке
3. Нет fallback для пользователей с несколькими тенантами

## Решение
Улучшить логику `TenantContext` для поддержки legacy маршрутов:

1. При отсутствии slug в URL - пытаться восстановить из localStorage
2. Если в localStorage есть `last_tenant_slug` - использовать его
3. Если нет - автоматически выбирать первый доступный тенант
4. Показывать предупреждение если тенантов нет

## Технические изменения

### Файл: src/contexts/TenantContext.tsx

Изменить блок кода в `fetchMemberships` (строки 138-173):

```typescript
// Determine current tenant from URL
const urlSlug = getTenantSlugFromUrl();

if (urlSlug) {
  // Existing logic for URL-based tenant selection
  // ...
} else {
  // No tenant in URL - use fallback logic
  const savedSlug = localStorage.getItem('last_tenant_slug');
  
  if (savedSlug) {
    // Try to restore from localStorage
    const savedMembership = memberships.find(m => m.tenant?.slug === savedSlug);
    if (savedMembership?.tenant) {
      setCurrentTenantState(savedMembership.tenant);
      return;
    }
  }
  
  // Fallback: select first available active tenant
  const firstActiveMembership = memberships.find(m => m.status === 'active' && m.tenant);
  if (firstActiveMembership?.tenant) {
    setCurrentTenantState(firstActiveMembership.tenant);
    localStorage.setItem('last_tenant_slug', firstActiveMembership.tenant.slug);
  } else {
    setCurrentTenantState(null);
  }
}
```

## Ожидаемый результат
- Пользователи на legacy маршрутах автоматически получат выбранный тенант
- Последний использованный тенант сохраняется между сессиями
- Приглашения будут отправляться с корректным `tenant_id`
