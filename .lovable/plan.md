

## Исправление: страница перезагружается после импорта мероприятий

### Проблема
В `src/components/Layout.tsx` строка 370 — `window.location.reload()` вызывается в `onImportComplete`. Это принудительно перезагружает страницу после импорта. Плюс двойной toast (один в EventsImportDialog, другой в Layout).

### Решение
В `src/components/Layout.tsx` (строки 363-371):
- Убрать `window.location.reload()`
- Вместо этого использовать invalidation кэша React Query для обновления данных мероприятий без перезагрузки
- Убрать дублирующий toast (оставить только один — тот что в EventsImportDialog с детальной статистикой)

```tsx
// Layout.tsx — onImportComplete callback
onImportComplete={() => {
  setShowEventsImportDialog(false);
  // React Query автоматически обновит данные через invalidation в хуке
}}
```

Также нужно добавить `queryClient.invalidateQueries({ queryKey: ['events'] })` если его нет, чтобы данные обновились без перезагрузки.

### Файл
- **Изменить**: `src/components/Layout.tsx` — строки 363-371, убрать reload и дублирующий toast

