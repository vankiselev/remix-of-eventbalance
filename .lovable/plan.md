
# Исправление Real-time обновления при удалении транзакций

## Проблема

При удалении транзакции из диалога деталей (`TransactionDetailDialog`) происходит полная перезагрузка страницы вместо real-time обновления списка. Это противоречит принципам React Query и UX ожиданиям.

## Причина

В файле `src/components/finance/TransactionDetailDialog.tsx` найдены 3 вызова `window.location.reload()`:
- Строка 173: после публикации черновика
- Строка 251: после повторной отправки перевода  
- Строка 284: после удаления транзакции

Это устаревший подход. Для сравнения, в `EnhancedTransactionTableNew.tsx` удаление уже работает правильно через `queryClient.invalidateQueries()`.

## Решение

Заменить все `window.location.reload()` на инвалидацию React Query кэша:

### Изменения в `src/components/finance/TransactionDetailDialog.tsx`:

1. **Добавить импорт `useQueryClient`**:
```typescript
import { useQueryClient } from "@tanstack/react-query";
```

2. **Инициализировать queryClient в компоненте**:
```typescript
const queryClient = useQueryClient();
```

3. **Заменить `window.location.reload()` на инвалидацию** (3 места):

```typescript
// Вместо: window.location.reload();
queryClient.invalidateQueries({ queryKey: ['transactions'] });
```

## Какие query keys нужно инвалидировать

При изменении транзакции нужно обновить:
- `['transactions']` - основной список
- `['company-cash-summary']` - сводка по компании
- `['user-cash-summary']` - сводка по пользователю
- `['dashboard-stats']` - статистика на дашборде

## Результат

После изменений:
- Удаление транзакции мгновенно убирает её из списка без перезагрузки
- Публикация черновика обновляет список без перезагрузки
- Повторная отправка перевода обновляет статус без перезагрузки
- Сохраняется скролл-позиция и состояние фильтров

## Техническая информация

Файлы для изменения:
- `src/components/finance/TransactionDetailDialog.tsx`

Изменения минимальны - добавляется 1 импорт, 1 инициализация хука, и заменяются 3 строки кода.
