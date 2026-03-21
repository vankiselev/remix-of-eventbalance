

## Проблема

Миграция `20260321_add_car_columns_to_event_reports.sql` **не была применена** к базе данных. Таблица `event_reports` по-прежнему содержит только 13 колонок без `car_kilometers` и `without_car`. Код при INSERT пытается записать в несуществующие колонки → ошибка.

Вероятная причина: формат имени файла миграции (`20260321_add_car_...`) отличается от рабочего формата (`20250929124426_e41107ba-...` с UUID). Система могла не подхватить файл.

## Решение

1. **Удалить старый файл миграции** `migrations/20260321_add_car_columns_to_event_reports.sql`

2. **Создать новую миграцию с правильным форматом имени** (timestamp + UUID):
   ```sql
   ALTER TABLE public.event_reports 
     ADD COLUMN IF NOT EXISTS car_kilometers numeric,
     ADD COLUMN IF NOT EXISTS without_car boolean DEFAULT false;
   ```

3. **Добавить защиту в код** (`Reports.tsx`): на случай если миграция ещё не применена, исключить `car_kilometers` и `without_car` из insert/update объектов, если значения пустые, и обернуть вставку в try/catch с повторной попыткой без этих полей.

Затрагиваемые файлы:
- `migrations/20260321_add_car_columns_to_event_reports.sql` → удалить
- `migrations/20260321100000_<uuid>.sql` → создать
- `src/components/Reports.tsx` → добавить fallback при ошибке вставки

