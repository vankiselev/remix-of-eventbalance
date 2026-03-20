

## План: Расширение регистрации по приглашению + уведомления админам + убрать самостоятельную регистрацию

### 1. Убрать вкладку «Регистрация» из AuthPage

**Файл: `src/pages/AuthPage.tsx`**
- Удалить `Tabs`/`TabsList`/`TabsTrigger` (вход/регистрация) — оставить только форму входа
- Удалить `handleSignUp`, `registrationSuccess`, `agreedToTerms`, `fullName` и связанный код
- Оставить форму входа и «Забыли пароль?»

### 2. Расширить форму регистрации по приглашению (InvitePage)

**Файл: `src/pages/InvitePage.tsx`**

Сейчас форма содержит только пароль. Добавить:
- **Фамилия** (обязательное)
- **Имя** (обязательное)
- **Отчество** (обязательное)
- **Телефон** (обязательное)
- **Дата рождения** (обязательное)
- **Фото профиля** (необязательное) — загрузка через `AvatarCropper` или выбор стандартной аватарки

Обновить zod-схему с валидацией всех полей. Передать данные в edge function `register-invited-user`.

### 3. Стандартные аватарки

**Файл: `src/pages/InvitePage.tsx`** (или вынести в компонент `DefaultAvatarPicker`)
- Набор из 8-10 стандартных SVG/PNG аватарок (градиентные инициалы, абстрактные иконки)
- При выборе стандартной аватарки — URL сохраняется в `avatar_url`
- При загрузке своего фото — открывается `AvatarCropper`, загрузка в storage bucket `avatars`

### 4. Обновить edge function `register-invited-user`

**Файл: `supabase/functions/register-invited-user/index.ts`**

Принимать дополнительные поля: `first_name`, `last_name`, `middle_name`, `phone`, `birth_date`, `avatar_url`. Записывать их в `profiles` при создании.

### 5. Добавить PendingUsersManagement в AdministrationPage

**Файл: `src/pages/AdministrationPage.tsx`**
- Импортировать `PendingUsersManagement`
- Во вкладке «Приглашения» добавить вложенные под-вкладки:
  - «Ожидающие одобрения» (PendingUsersManagement) — по умолчанию
  - «Приглашения по email» (InvitationsManagement)

### 6. Уведомление админам при регистрации нового пользователя

**Файл: `src/utils/notifications.ts`**
- Исправить `sendNotificationToAdmins`: запрашивать админов через `user_role_assignments` JOIN `role_definitions` вместо несуществующей колонки `profiles.role`

**Файл: `supabase/functions/register-invited-user/index.ts`**
- После создания пользователя — вставлять уведомление в таблицу `notifications` для каждого админа (через adminClient, напрямую INSERT, без вызова edge function)

### 7. Миграция БД (при необходимости)

Проверить наличие колонок в `profiles`:
- `middle_name` — если нет, добавить
- `phone`, `birth_date`, `first_name`, `last_name` — уже есть в схеме

Добавить RLS для INSERT в `notifications` (сейчас INSERT запрещён для authenticated — нужна политика или делать через service_role в edge function).

### Файлы

| Файл | Действие |
|---|---|
| `src/pages/AuthPage.tsx` | Убрать вкладку регистрации, оставить только вход |
| `src/pages/InvitePage.tsx` | Расширить форму: ФИО, телефон, дата рождения, фото/аватарка |
| `src/pages/AdministrationPage.tsx` | Добавить PendingUsersManagement во вкладку «Приглашения» |
| `src/utils/notifications.ts` | Исправить запрос админов |
| `supabase/functions/register-invited-user/index.ts` | Принимать новые поля, отправлять уведомления админам |
| Миграция | Добавить `middle_name` в profiles, если отсутствует |

