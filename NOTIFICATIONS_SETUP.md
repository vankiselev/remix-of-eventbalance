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

**Способ 1: Используя скрипт**
```bash
npx tsx scripts/generate-vapid-keys.ts
```

**Способ 2: Онлайн генератор**
1. Перейдите на https://www.stephane-quantin.com/en/tools/generators/vapid-keys
2. Сгенерируйте пару ключей

### Настройка ключей

1. **Публичный ключ** - добавьте в `.env`:
   ```
   VITE_VAPID_PUBLIC_KEY=ваш_публичный_ключ
   ```

2. **Приватный ключ** - добавьте в Supabase Secrets:
   - Откройте [Supabase Dashboard → Settings → Edge Functions](https://supabase.com/dashboard/project/wpxhmajdeunabximyfln/settings/functions)
   - Добавьте секрет: `VAPID_PRIVATE_KEY` со значением вашего приватного ключа
   - Также добавьте: `VAPID_PUBLIC_KEY` со значением публичного ключа

### Включение Web Push для пользователей

Пользователи могут включить push-уведомления:
1. Через меню уведомлений (колокольчик в верхней панели)
2. В настройках профиля
3. При первом входе система может предложить включить уведомления

### Проверка работы

После настройки ключей:
1. Откройте приложение в браузере
2. Включите Web Push-уведомления в настройках
3. Создайте тестовое уведомление (например, новую транзакцию)
4. Закройте вкладку браузера
5. Вы должны увидеть системное уведомление

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

## ✅ Web Push полностью реализован!

Система Web Push готова к использованию:
- ✅ VAPID ключи настраиваются через скрипт или онлайн
- ✅ Edge Function отправляет реальные push-уведомления
- ✅ Service Worker обрабатывает уведомления и навигацию
- ✅ Поддержка как веб, так и нативных платформ
- ✅ Автоматическая очистка невалидных подписок

### Поддержка браузеров

- ✅ Chrome/Edge (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Safari (desktop, macOS 16.4+)
- ⚠️ Safari iOS - только в PWA режиме (iOS 16.4+)
- ✅ Opera (desktop & mobile)

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
