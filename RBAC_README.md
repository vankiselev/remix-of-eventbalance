# RBAC (Role-Based Access Control) - Руководство

## Обзор системы ролей

Система использует гибкую RBAC-модель с разделением на роли и права доступа. Роли определяются в таблице `role_definitions`, права - в `permissions`, а связь между ними - в `role_permissions`.

## Базовые роли

### 1. Администратор (admin)
- **Код**: `admin`
- **is_admin_role**: `true`
- **Описание**: Полный доступ ко всем функциям системы
- **Права**: Все доступные разрешения
- **Проверка**: Через функцию `is_admin_user(auth.uid())`

### 2. Финансист (accountant)
- **Код**: `accountant`
- **is_admin_role**: `false`
- **Описание**: Управление финансами и транзакциями
- **Основные права**:
  - `transactions.review` - Просмотр всех транзакций
  - `transactions.approve` - Одобрение транзакций
  - `transactions.reject` - Отклонение транзакций
  - `finances.view_all` - Просмотр всех финансовых данных
  - `finances.edit_all` - Редактирование финансов
  - `finances.import` - Импорт данных
  - `finances.export` - Экспорт данных

### 3. Сотрудник (employee)
- **Код**: `employee`
- **is_admin_role**: `false`
- **Описание**: Базовый доступ для работы с собственными данными
- **Основные права**:
  - `finances.view_own` - Просмотр своих транзакций
  - `finances.create` - Создание транзакций
  - `finances.edit_own` - Редактирование своих транзакций
  - `finances.delete_own` - Удаление своих транзакций
  - `staff.view_basic` - Просмотр базовой информации о сотрудниках
  - `staff.edit_own` - Редактирование своего профиля

## Как создать новую роль

### 1. Создание роли в БД

```sql
-- Вставка новой роли
INSERT INTO public.role_definitions (code, name, description, is_admin_role)
VALUES ('new_role', 'Новая роль', 'Описание роли', false);
```

### 2. Назначение прав роли

```sql
-- Получить ID роли
SELECT id FROM public.role_definitions WHERE code = 'new_role';

-- Назначить права (пример для finances.view_all)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
VALUES (
  (SELECT id FROM role_definitions WHERE code = 'new_role'),
  (SELECT id FROM permissions WHERE code = 'finances.view_all'),
  true
);
```

### 3. Назначение роли пользователю

```sql
-- Назначить роль пользователю
INSERT INTO public.user_role_assignments (user_id, role_id)
VALUES (
  'USER_UUID_HERE',
  (SELECT id FROM role_definitions WHERE code = 'new_role')
);
```

### 4. Автоматическое обновление UI

После создания роли и назначения её пользователю:
- UI автоматически обновится через realtime-подписки
- Новая роль появится в бейджах и меню пользователя
- Права будут проверяться через `has_permission()` в RLS политиках
- Никаких изменений в коде не требуется!

## Категории разрешений

### Finances (Финансы)
- `finances.view_own` - Просмотр своих транзакций
- `finances.view_all` - Просмотр всех транзакций
- `finances.create` - Создание транзакций
- `finances.edit_own` - Редактирование своих транзакций
- `finances.edit_all` - Редактирование всех транзакций
- `finances.delete_own` - Удаление своих транзакций
- `finances.delete_all` - Удаление всех транзакций
- `finances.import` - Импорт данных
- `finances.export` - Экспорт данных

### Transactions (Транзакции)
- `transactions.review` - Просмотр транзакций на проверку
- `transactions.approve` - Одобрение транзакций
- `transactions.reject` - Отклонение транзакций
- `transactions.view_all` - Просмотр всех транзакций

### Staff (Персонал)
- `staff.view_basic` - Просмотр базовой информации
- `staff.view_salary` - Просмотр зарплат
- `staff.view_all` - Просмотр всех данных сотрудников
- `staff.edit_own` - Редактирование своего профиля
- `staff.edit_all` - Редактирование всех профилей
- `staff.manage` - Полное управление сотрудниками

### Contacts (Контакты)
- `contacts.view` - Просмотр контактов
- `contacts.create` - Создание контактов
- `contacts.edit` - Редактирование контактов
- `contacts.delete` - Удаление контактов

### Events (События)
- `events.view` - Просмотр событий
- `events.create` - Создание событий
- `events.edit` - Редактирование событий
- `events.delete` - Удаление событий
- `events.manage` - Полное управление событиями

### System (Система)
- `system.settings` - Настройки системы
- `system.roles` - Управление ролями
- `system.invitations` - Управление приглашениями

## Проверка прав в коде

### Backend (RLS политики)

```sql
-- Проверка конкретного права
CREATE POLICY "Users with permission can view"
ON some_table FOR SELECT
USING (has_permission('some.permission'));

-- Проверка админа
CREATE POLICY "Admins can do anything"
ON some_table FOR ALL
USING (is_admin_user(auth.uid()));
```

### Frontend (React)

```typescript
import { useUserPermissions } from "@/hooks/useUserPermissions";

function MyComponent() {
  const { hasPermission } = useUserPermissions();
  
  // Проверка конкретного права
  if (hasPermission('finances.view_all')) {
    // Показать элемент
  }
  
  return <div>...</div>;
}
```

### Отображение ролей

```typescript
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";
import { RoleBadges } from "@/components/roles/RoleBadge";

function UserProfile({ userId }) {
  const { roles, isAdmin } = useUserRbacRoles(userId);
  
  return (
    <div>
      <RoleBadges roles={roles} />
      {isAdmin && <p>Это администратор</p>}
    </div>
  );
}
```

## Важные правила

1. **Никогда не используйте `profiles.role` для проверки прав** - это легаси система
2. **Всегда используйте `is_admin_user()` для проверки админа** в RLS политиках
3. **Используйте `has_permission()` для конкретных прав** в RLS
4. **Не назначайте административные права** (`staff.manage`, `system.*`) обычным ролям
5. **Флаг `is_admin_role=true`** должен быть только у реальных администраторов
6. **При создании новой роли** не требуется менять код - всё работает через БД

## Миграция и совместимость

Система поддерживает две системы ролей для совместимости:
- **Новая система**: `role_definitions` + `user_role_assignments` (приоритетная)
- **Легаси система**: `profiles.role` + `user_roles` (для совместимости)

Функция `has_role()` проверяет обе системы, но новые роли создавайте только в новой системе.

## Отладка

### Проверить роли пользователя

```sql
SELECT 
  p.full_name,
  rd.name as role_name,
  rd.code as role_code,
  rd.is_admin_role
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN role_definitions rd ON rd.id = ura.role_id
WHERE p.id = 'USER_UUID';
```

### Проверить права роли

```sql
SELECT 
  rd.name as role_name,
  perm.code as permission_code,
  perm.name as permission_name,
  rp.granted
FROM role_definitions rd
JOIN role_permissions rp ON rp.role_id = rd.id
JOIN permissions perm ON perm.id = rp.permission_id
WHERE rd.code = 'accountant'
ORDER BY perm.category, perm.code;
```

## Контакты для вопросов

При возникновении вопросов по RBAC системе обратитесь к разработчику или администратору системы.
