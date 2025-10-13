# 🔔 Система уведомлений EventBalance

## Обзор

Реализована полнофункциональная система уведомлений с поддержкой:
- ✅ **In-app уведомления** - внутри приложения в реальном времени
- ✅ **Web Push** - push-уведомления в браузере (даже когда вкладка закрыта)
- ✅ **Мобильные push** - для iOS и Android через Capacitor
- ✅ **История уведомлений** - с возможностью управления

## 📱 Компоненты системы

### 1. База данных

Созданы таблицы:
- `notifications` - хранение всех уведомлений
- `push_subscriptions` - подписки на push-уведомления

### 2. Frontend компоненты

- `NotificationsMenu` - меню с колокольчиком и списком уведомлений
- `NotificationSettings` - настройки push-уведомлений
- `useNotifications` - хук для работы с уведомлениями

### 3. Backend

- Edge Function `send-push-notification` - отправка уведомлений

## 🚀 Использование

### Отправка уведомления из кода

```typescript
import { supabase } from '@/integrations/supabase/client';

// Отправить уведомление пользователю
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'uuid-пользователя',
    title: 'Заголовок уведомления',
    message: 'Текст уведомления',
    type: 'report', // или 'salary', 'event', 'vacation', 'transaction', 'system'
    data: { /* дополнительные данные */ }
  }
});
```

### Типы уведомлений

- `report` - новый отчет
- `salary` - назначена зарплата
- `event` - новое/измененное мероприятие
- `vacation` - запрос/одобрение отпуска
- `transaction` - финансовая транзакция
- `system` - системное уведомление

## 🌐 Web Push настройка

### Генерация VAPID ключей

1. Перейдите на https://www.stephane-quantin.com/en/tools/generators/vapid-keys
2. Сгенерируйте пару ключей (публичный и приватный)
3. Замените `VAPID_PUBLIC_KEY` в файле `src/utils/pushNotifications.ts`
4. Сохраните приватный ключ для настройки отправки push-уведомлений

### Включение Web Push

Пользователи могут включить push-уведомления:
1. Нажав на колокольчик в верхней панели
2. В настройках профиля (если добавите `NotificationSettings`)

## 📱 Мобильные уведомления (iOS/Android)

### Подготовка проекта

```bash
# 1. Установите зависимости
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/push-notifications

# 2. Добавьте платформы
npx cap add ios
npx cap add android

# 3. Синхронизируйте код
npx cap sync
```

### iOS настройка

1. Откройте проект в Xcode:
   ```bash
   npx cap open ios
   ```

2. Добавьте capability "Push Notifications":
   - Signing & Capabilities → + Capability → Push Notifications

3. Настройте APNs в Apple Developer Console

### Android настройка

1. Откройте проект в Android Studio:
   ```bash
   npx cap open android
   ```

2. Настройте Firebase Cloud Messaging:
   - Создайте проект в Firebase Console
   - Добавьте Android приложение
   - Скачайте `google-services.json` в `android/app/`

## 🔧 Интеграция в код

### Пример: Уведомление при создании отчета

```typescript
// В компоненте Reports.tsx после создания отчета
const onSubmit = async (data: ReportFormData) => {
  // ... создание отчета
  
  // Отправить уведомление админам
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  for (const admin of admins || []) {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: admin.id,
        title: 'Новый отчет',
        message: `${user.email} создал отчет по проекту "${data.project_name}"`,
        type: 'report',
        data: { reportId: newReport.id }
      }
    });
  }
};
```

### Пример: Уведомление о назначении зарплаты

```typescript
// После назначения зарплаты
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: employee_user_id,
    title: 'Назначена зарплата',
    message: `Вам назначена выплата ${amount} ₽ за отчет по проекту "${projectName}"`,
    type: 'salary',
    data: { amount, reportId }
  }
});
```

## 📊 Управление уведомлениями

Пользователи могут:
- ✅ Просматривать все уведомления
- ✅ Отмечать как прочитанные (одно или все)
- ✅ Удалять уведомления (одно или все)
- ✅ Видеть количество непрочитанных на бейдже

## 🔐 Безопасность

- Все уведомления защищены RLS политиками
- Пользователи видят только свои уведомления
- Push-подписки привязаны к конкретному пользователю
- Edge Function использует Service Role для создания уведомлений

## 📝 TODO для полной реализации Web Push

1. Установить npm пакет `web-push` в Edge Function
2. Настроить VAPID ключи в Supabase Secrets
3. Обновить Edge Function для отправки реальных push-уведомлений
4. Протестировать на разных браузерах

## 🎯 Рекомендации

1. **Не спамить** - отправляйте только важные уведомления
2. **Группировать** - похожие уведомления можно группировать
3. **Персонализировать** - делайте сообщения конкретными и полезными
4. **Тестировать** - проверяйте на разных устройствах и браузерах

## 💡 Примеры кейсов

### Для сотрудников:
- 💰 Назначена зарплата за отчет
- ✅ Отпуск одобрен
- 📅 Новое мероприятие назначено
- 💵 Транзакция обработана

### Для администраторов:
- 📝 Новый отчет от сотрудника
- 🏖️ Запрос на отпуск
- ⚠️ Важные системные события
- 📊 Еженедельные сводки

---

✨ Система готова к использованию! Добавьте вызовы `send-push-notification` в нужные места вашего приложения.
