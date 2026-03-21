

## Проблема

При создании отчёта сотрудником возникает ошибка, потому что код пытается записать в колонки `car_kilometers` и `without_car`, которых **не существует** в таблице `event_reports` в базе данных (миграции для них не были применены).

Текущие колонки таблицы: `id`, `event_id`, `user_id`, `title`, `status`, `tenant_id`, `created_at`, `updated_at`, `project_name`, `start_time`, `end_time`, `preparation_work`, `onsite_work`.

## Решение

1. **Миграция БД** — добавить недостающие колонки:
   - `car_kilometers numeric` (nullable)
   - `without_car boolean DEFAULT false`

2. **Никаких изменений в коде** — код уже корректно использует эти поля, просто колонок нет в БД.

## Технические детали

- Файл: новая миграция SQL
- SQL: `ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS car_kilometers numeric; ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS without_car boolean DEFAULT false;`

