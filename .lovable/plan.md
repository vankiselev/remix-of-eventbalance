

## Исправление: ошибка "permission denied for table events" при импорте

### Проблема
Edge-функция `events-import` вызывается на self-hosted Supabase сервере (`superbag.eventbalance.ru`), но service_role_key на этом сервере не имеет прав на INSERT в таблицу `events`. Все 29 строк падают с ошибкой `permission denied for table events`.

### Решение
Убрать вызов edge-функции и выполнять импорт напрямую из клиента через Supabase JS SDK. У авторизованного пользователя уже есть RLS-политика, разрешающая INSERT и UPDATE в таблицу `events`.

### Изменения в `src/components/EventsImportDialog.tsx`

Переписать функцию `performImport` (строки 531-621):

1. Вместо `supabase.functions.invoke('events-import', ...)` — использовать `supabase.from('events').insert(...)` и `supabase.from('events').update(...)` напрямую
2. Для каждой строки:
   - Парсим time_range в `event_time` и `end_time` (перенести логику парсинга времени из edge-функции в клиент)
   - Маппим `place` → `location`, `photo`+`video` → `photo_video`
   - Проверяем существование записи по `start_date` + `name` (ilike)
   - Если существует — update, иначе — insert
3. Получаем `tenant_id` из `tenant_memberships` текущего пользователя

### Логика парсинга времени (из edge-функции → в клиент)
- Добавить вспомогательные функции `parseSingleTime` и `parseTimeRange` в компонент
- Обработка форматов: `HH:MM`, `HH.MM`, `HH-HH`, десятичных чисел, ISO строк с датой Excel (`1899-12-30T...`)

### Файлы
- **Изменить**: `src/components/EventsImportDialog.tsx` — переписать `performImport` на прямые запросы к БД

