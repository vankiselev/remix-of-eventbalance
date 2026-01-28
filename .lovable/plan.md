
# Двухэтапная регистрация с приглашением администратора

## Обзор изменений

Предлагается новый поток регистрации:
1. **Пользователь регистрируется самостоятельно** — создает аккаунт с email/паролем
2. **Аккаунт в статусе "ожидает приглашения"** — пользователь видит страницу ожидания
3. **Администратор приглашает** — выбирает из списка незаприглашенных пользователей и назначает роль
4. **Пользователь получает доступ** — после приглашения может войти в систему

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Регистрация    │───▶│  Ожидание       │───▶│  Полный доступ  │
│  (AuthPage)     │    │  приглашения    │    │  (Dashboard)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Админ выбирает │
                       │  роль и         │
                       │  приглашает     │
                       └─────────────────┘
```

---

## Изменения в базе данных

### Миграция 1: Добавление статуса в profiles

**Файл:** `migrations/20260128100000_add_pending_invitation_status.sql`

Добавляем новый статус в `profiles`:
- Поле `invitation_status`: `pending` (по умолчанию для самостоятельной регистрации), `invited` (после приглашения админом)
- Поле `invited_at`: дата приглашения администратором

```sql
-- Добавляем колонки
ALTER TABLE public.profiles 
ADD COLUMN invitation_status text NOT NULL DEFAULT 'invited' 
CHECK (invitation_status IN ('pending', 'invited'));

ALTER TABLE public.profiles 
ADD COLUMN invited_at timestamp with time zone;

ALTER TABLE public.profiles 
ADD COLUMN invited_by uuid REFERENCES auth.users(id);

-- Индекс для поиска ожидающих пользователей
CREATE INDEX idx_profiles_invitation_status 
ON public.profiles(invitation_status) 
WHERE invitation_status = 'pending';
```

### Миграция 2: Обновление handle_new_user триггера

При самостоятельной регистрации пользователь получает статус `pending`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, invitation_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    'employee',
    'pending'  -- Самостоятельная регистрация = ожидает приглашения
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Миграция 3: Безопасная функция для приглашения пользователя

```sql
CREATE OR REPLACE FUNCTION public.invite_pending_user(
  target_user_id uuid,
  role_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем что вызывающий - админ
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Требуются права администратора';
  END IF;
  
  -- Обновляем статус пользователя
  UPDATE public.profiles
  SET 
    invitation_status = 'invited',
    invited_at = now(),
    invited_by = auth.uid()
  WHERE id = target_user_id AND invitation_status = 'pending';
  
  -- Назначаем RBAC роль
  INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
  VALUES (target_user_id, role_id_param, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role_id = role_id_param, assigned_by = auth.uid();
  
  RETURN true;
END;
$$;
```

---

## Изменения во фронтенде

### 1. Новая страница ожидания приглашения

**Файл:** `src/pages/AwaitingInvitationPage.tsx`

Страница для пользователей со статусом `pending`:
- Информативное сообщение "Ваша заявка на рассмотрении"
- Кнопка выхода
- Автоматическое обновление статуса через realtime subscription

### 2. Обновление AuthContext

**Файл:** `src/contexts/AuthContext.tsx`

Добавляем проверку `invitation_status`:
- Если `pending` — перенаправляем на `/awaiting-invitation`
- Если `invited` — разрешаем доступ к системе

### 3. Обновление ProtectedRoute

**Файл:** `src/components/ProtectedRoute.tsx`

Добавляем проверку статуса приглашения:
- Если пользователь в статусе `pending` — редирект на страницу ожидания

### 4. Обновление AuthPage

**Файл:** `src/pages/AuthPage.tsx`

После регистрации:
- Показать сообщение "Регистрация успешна! Ожидайте приглашения от администратора"
- Добавить чекбокс согласия с Политикой конфиденциальности и Условиями использования (ФЗ-152)

### 5. Новый компонент для приглашения зарегистрированных пользователей

**Файл:** `src/components/admin/PendingUsersManagement.tsx`

Таблица пользователей со статусом `pending`:
- Email, имя, дата регистрации
- Выбор роли из RBAC
- Кнопка "Пригласить"
- Кнопка "Отклонить" (удаление аккаунта)

### 6. Обновление страницы приглашений

**Файл:** `src/pages/InvitationsPage.tsx`

Добавляем табы:
- "Ожидающие пользователи" — новый список
- "Приглашения по email" — существующий функционал

### 7. Маршрутизация

**Файл:** `src/App.tsx`

Добавляем новый маршрут:
```tsx
<Route path="/awaiting-invitation" element={<AwaitingInvitationPage />} />
```

---

## Безопасность

1. **RLS политики** — пользователи со статусом `pending` не могут просматривать данные системы
2. **RBAC** — роль назначается только при приглашении администратором
3. **Проверка на бэкенде** — функция `invite_pending_user` проверяет права админа

---

## Сводка файлов

| Файл | Действие |
|------|----------|
| `migrations/20260128100000_add_pending_invitation_status.sql` | Создать миграцию |
| `src/pages/AwaitingInvitationPage.tsx` | Создать страницу ожидания |
| `src/pages/AuthPage.tsx` | Добавить чекбокс согласия + сообщение |
| `src/contexts/AuthContext.tsx` | Добавить проверку invitation_status |
| `src/components/ProtectedRoute.tsx` | Добавить редирект для pending |
| `src/components/admin/PendingUsersManagement.tsx` | Создать компонент |
| `src/pages/InvitationsPage.tsx` | Добавить табы |
| `src/App.tsx` | Добавить маршрут |

---

## Соответствие требованиям ФЗ-152

При самостоятельной регистрации добавляется обязательный чекбокс:
- "Я соглашаюсь с Политикой конфиденциальности и Условиями использования"
- Кнопка регистрации неактивна до принятия согласия
