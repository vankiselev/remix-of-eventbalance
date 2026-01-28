
# Мультитенантная Архитектура EventBalance

## Обзор

Преобразование системы из single-tenant в полноценную SaaS-платформу, где каждая компания работает в изолированном окружении.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      eventbalance.ru                                │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│  /fantasykids │  /rainbowkids │  /superparty  │  /admin (superadmin) │
├──────────────┴──────────────┴──────────────┴───────────────────────┤
│                  Единая база данных PostgreSQL                      │
│                  Данные изолированы по tenant_id                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Фаза 1: Фундамент — Таблица Компаний

### Миграция: Создание таблицы tenants

```sql
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,  -- "fantasykids" для URL
  name text NOT NULL,          -- "Fantasy Kids" отображаемое имя
  logo_url text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  trial_ends_at timestamp with time zone,
  plan text DEFAULT 'trial',   -- trial, basic, pro, enterprise
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Миграция: Связь пользователей с компаниями

Так как один пользователь может быть в нескольких компаниях:

```sql
CREATE TABLE public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES role_definitions(id),
  is_owner boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_at timestamp with time zone,
  joined_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
```

---

## Фаза 2: Добавление tenant_id во все таблицы

### Список таблиц для изменения (50+ таблиц)

Каждая бизнес-таблица получает колонку `tenant_id`:

| Группа | Таблицы |
|--------|---------|
| **Контакты** | profiles, clients, animators, contractors, venues |
| **Мероприятия** | events, event_reports, event_report_salaries, event_action_requests |
| **Финансы** | financial_transactions, financial_reports, expenses, incomes |
| **Склад** | warehouse_items, warehouse_categories, warehouse_stock, warehouse_tasks |
| **Задачи** | tasks, task_checklists, task_comments |
| **RBAC** | role_definitions, permissions, role_permissions (локальные роли) |
| **Прочее** | vacations, notifications, invitations, chat_rooms |

### Стратегия миграции

```sql
-- Добавляем tenant_id (nullable сначала)
ALTER TABLE public.events ADD COLUMN tenant_id uuid REFERENCES tenants(id);

-- Создаем default tenant для существующих данных
INSERT INTO tenants (slug, name) VALUES ('default', 'Default Company')
RETURNING id INTO default_tenant_id;

-- Мигрируем существующие данные
UPDATE public.events SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

-- Делаем NOT NULL
ALTER TABLE public.events ALTER COLUMN tenant_id SET NOT NULL;

-- Индекс для производительности
CREATE INDEX idx_events_tenant ON public.events(tenant_id);
```

---

## Фаза 3: Row Level Security (RLS)

### Функции-помощники

```sql
-- Получить текущий tenant из JWT claims или сессии
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('app.current_tenant_id', true))::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Проверить членство пользователя в tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### RLS политики для каждой таблицы

```sql
-- Пример для events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for events"
ON events FOR ALL
USING (user_belongs_to_tenant(tenant_id))
WITH CHECK (user_belongs_to_tenant(tenant_id));
```

---

## Фаза 4: URL-роутинг и Tenant Context

### Изменения в роутере React

```text
eventbalance.ru/              → Landing Page
eventbalance.ru/auth          → Общая авторизация
eventbalance.ru/register      → Регистрация новой компании
eventbalance.ru/fantasykids/  → Dashboard Fantasy Kids
eventbalance.ru/rainbowkids/  → Dashboard Rainbow Kids
eventbalance.ru/admin/        → Суперадмин панель
```

### Новые компоненты

| Компонент | Описание |
|-----------|----------|
| `TenantProvider` | Контекст с текущим tenant, извлекает slug из URL |
| `TenantGuard` | HOC, проверяет доступ к tenant |
| `TenantSwitcher` | Выпадающее меню для переключения между компаниями |
| `TenantLayout` | Layout с логотипом и настройками компании |

### Логика определения tenant

```typescript
// Из URL: /fantasykids/dashboard
const pathParts = location.pathname.split('/');
const tenantSlug = pathParts[1]; // "fantasykids"

// Проверяем в API
const { data: tenant } = await supabase
  .from('tenants')
  .select('*')
  .eq('slug', tenantSlug)
  .single();
```

---

## Фаза 5: Регистрация компании

### Новый флоу регистрации

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Регистрация    │────▶│  Создание       │────▶│  Настройка      │
│  пользователя   │     │  компании       │     │  компании       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────▶│  Выбор slug     │
                        │  (URL компании) │
                        └─────────────────┘
```

### Страница /register

- Шаг 1: Email, пароль (как сейчас)
- Шаг 2: Название компании, slug (fantasykids)
- Шаг 3: Базовые настройки (логотип, часовой пояс)

### Edge Function: create-tenant

```typescript
// Создает tenant + назначает owner
Deno.serve(async (req) => {
  const { name, slug } = await req.json();
  
  // Валидация slug (a-z, 0-9, -)
  // Проверка уникальности
  // Создание tenant
  // Создание tenant_membership с is_owner = true
});
```

---

## Фаза 6: Изоляция Storage

### Структура bucket'ов

```text
storage/
├── avatars/
│   ├── fantasykids/
│   │   └── user-123/avatar.jpg
│   └── rainbowkids/
│       └── user-456/avatar.jpg
├── events/
│   ├── fantasykids/
│   │   └── event-789/photos/...
│   └── rainbowkids/
│       └── event-012/photos/...
└── warehouse/
    ├── fantasykids/
    │   └── item-345/image.jpg
    └── rainbowkids/
        └── item-678/image.jpg
```

### RLS политики для Storage

```sql
CREATE POLICY "Tenant isolation for storage"
ON storage.objects FOR ALL
USING (
  -- Путь начинается с tenant_slug
  (storage.foldername(name))[1] IN (
    SELECT t.slug FROM tenants t
    JOIN tenant_memberships tm ON tm.tenant_id = t.id
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);
```

---

## Фаза 7: Суперадмин панель

### Доступ: /admin/

Доступна только пользователям с `is_super_admin = true` в profiles.

### Функционал

| Раздел | Возможности |
|--------|-------------|
| **Компании** | Список, статистика, блокировка, удаление |
| **Пользователи** | Все пользователи системы, их членства |
| **Финансы** | Подписки, платежи, лимиты |
| **Статистика** | Общие метрики, активность |
| **Настройки** | Глобальные настройки системы |

### Новая колонка в profiles

```sql
ALTER TABLE profiles ADD COLUMN is_super_admin boolean DEFAULT false;
```

---

## Фаза 8: Приглашения внутри компании

### Обновленный флоу приглашений

Существующая система приглашений адаптируется для мультитенантности:

```sql
ALTER TABLE invitations ADD COLUMN tenant_id uuid REFERENCES tenants(id);
```

При принятии приглашения:
1. Создается профиль пользователя (если нет)
2. Создается `tenant_membership` с назначенной ролью
3. Пользователь перенаправляется на /{tenant_slug}/dashboard

---

## Порядок реализации

### Этап 1: Базовая инфраструктура (Миграции)
1. Таблица `tenants`
2. Таблица `tenant_memberships`
3. Колонка `is_super_admin` в profiles
4. Функции-помощники (get_current_tenant_id, user_belongs_to_tenant)

### Этап 2: Миграция существующих данных
1. Создание default tenant
2. Добавление `tenant_id` во все таблицы (поэтапно)
3. Обновление существующих данных
4. Настройка RLS политик

### Этап 3: Frontend
1. TenantProvider и TenantContext
2. Обновление роутинга (/:tenant_slug/...)
3. TenantGuard для проверки доступа
4. TenantSwitcher в навигации

### Этап 4: Регистрация компании
1. Страница /register с созданием компании
2. Edge Function create-tenant
3. Onboarding wizard

### Этап 5: Storage изоляция
1. Обновление путей загрузки файлов
2. RLS политики для storage.objects

### Этап 6: Суперадмин
1. Страница /admin
2. Управление компаниями
3. Статистика и мониторинг

---

## Технические детали

### Изменения в AuthContext

```typescript
interface AuthContextType {
  // Существующие поля
  user: User | null;
  // ...
  
  // Новые поля
  currentTenant: Tenant | null;
  tenantMemberships: TenantMembership[];
  setCurrentTenant: (tenant: Tenant) => void;
  hasTenantAccess: (tenantSlug: string) => boolean;
}
```

### Изменения в Supabase клиенте

Каждый запрос должен учитывать tenant:

```typescript
// До
supabase.from('events').select('*')

// После
supabase.from('events')
  .select('*')
  .eq('tenant_id', currentTenant.id)
```

### Realtime подписки

```typescript
supabase.channel('events')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'events',
    filter: `tenant_id=eq.${currentTenant.id}` // Фильтр по tenant
  }, callback)
```

---

## Количество файлов для изменения

| Категория | Количество |
|-----------|------------|
| Миграции SQL | ~15 файлов |
| Новые компоненты | ~10 файлов |
| Изменение hooks | ~20 файлов |
| Изменение страниц | ~30 файлов |
| Edge Functions | ~3 файла |
| **Итого** | ~80 файлов |

---

## Риски и рекомендации

1. **Постепенная миграция** — не делать все сразу, этапами
2. **Обратная совместимость** — default tenant для существующих пользователей
3. **Тестирование RLS** — критически важно проверить изоляцию данных
4. **Производительность** — индексы на tenant_id обязательны
5. **Rollback план** — возможность откатить изменения

