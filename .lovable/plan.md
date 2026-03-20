

## Карточка компании с редактированием + маршрутизация

### Подход к URL

Используем path-based маршрутизацию: `eventbalance.ru/fantasy-kids/dashboard`. Это проще субдоменов (не нужна wildcard DNS, SSL на каждый субдомен). TenantContext уже умеет извлекать slug из URL.

### Что нужно сделать

**1. Расширить таблицу tenants (миграция)**

Добавить колонки для полноценной карточки компании:
- `logo_url` (text) — логотип
- `description` (text) — описание
- `inn` (text) — ИНН
- `legal_name` (text) — юридическое название
- `address` (text) — адрес
- `phone` (text) — телефон
- `email` (text) — email
- `is_active` (boolean, default true)
- `plan` (text, default 'trial')
- `settings` (jsonb, default '{}')

Добавить RLS политику UPDATE для суперадминов и владельцев тенанта.

**2. Создать `TenantDetailDialog.tsx`**

Диалог редактирования компании с полями: название, slug, описание, ИНН, юр. название, адрес, телефон, email. Сохранение через `supabase.from('tenants').update(...)`.

**3. Обновить `TenantsManagement.tsx`**

- Карточки компаний показывают больше информации (email, телефон, статус)
- Кнопка "Редактировать" открывает `TenantDetailDialog`
- Подтягивать новые поля из БД

**4. Добавить tenant-scoped маршруты в `App.tsx`**

Добавить маршруты вида `/:tenantSlug/dashboard`, `/:tenantSlug/finances` и т.д. — они будут использовать те же компоненты, но TenantContext автоматически подхватит slug из URL.

### Файлы

| Файл | Действие |
|---|---|
| Миграция | Создать — расширить таблицу tenants + RLS UPDATE |
| `src/components/admin/TenantDetailDialog.tsx` | Создать — форма редактирования компании |
| `src/components/admin/TenantsManagement.tsx` | Изменить — расширенные карточки + кнопка редактирования |
| `src/App.tsx` | Изменить — добавить `/:tenantSlug/*` маршруты |

