
# Включение Real-time для всех таблиц системы

## Текущая проблема

В коде (App.tsx) настроены подписки на 17 таблиц, но только 10 из них реально добавлены в Supabase Realtime publication. Это объясняет, почему real-time не работает для задач и других модулей.

---

## Что будет сделано

### 1. Единая миграция для включения realtime на все таблицы

Создадим миграцию `migrations/20260128_enable_all_realtime.sql`:

```sql
-- Включаем REPLICA IDENTITY FULL для корректной работы realtime с RLS
ALTER TABLE public.animators REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.contractors REPLICA IDENTITY FULL;
ALTER TABLE public.venues REPLICA IDENTITY FULL;
ALTER TABLE public.category_icons REPLICA IDENTITY FULL;
ALTER TABLE public.warehouse_items REPLICA IDENTITY FULL;
ALTER TABLE public.warehouse_stock REPLICA IDENTITY FULL;
ALTER TABLE public.warehouse_categories REPLICA IDENTITY FULL;
ALTER TABLE public.warehouse_locations REPLICA IDENTITY FULL;
ALTER TABLE public.warehouse_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_checklists REPLICA IDENTITY FULL;
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;

-- Добавляем таблицы в realtime publication (с обработкой ошибок если уже добавлены)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.animators;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ... и так для всех 12 таблиц
```

---

## Полный список таблиц для realtime

| Таблица | Статус до | Статус после |
|---------|-----------|--------------|
| events | Включено | Включено |
| financial_transactions | Включено | Включено |
| vacations | Включено | Включено |
| profiles | Включено | Включено |
| tasks | Включено | Включено |
| event_reports | Включено | Включено |
| event_report_salaries | Включено | Включено |
| user_role_assignments | Включено | Включено |
| notifications | Включено | Включено |
| messages | Включено | Включено |
| **animators** | Нет | Добавляем |
| **clients** | Нет | Добавляем |
| **contractors** | Нет | Добавляем |
| **venues** | Нет | Добавляем |
| **category_icons** | Нет | Добавляем |
| **warehouse_items** | Нет | Добавляем |
| **warehouse_stock** | Нет | Добавляем |
| **warehouse_categories** | Нет | Добавляем |
| **warehouse_locations** | Нет | Добавляем |
| **warehouse_tasks** | Нет | Добавляем |
| **task_checklists** | Нет | Добавляем |
| **task_comments** | Нет | Добавляем |

---

## Важно знать

- `REPLICA IDENTITY FULL` необходим для работы realtime с RLS-политиками
- Каждая таблица добавляется с обработкой ошибки `duplicate_object` на случай, если уже была добавлена ранее
- После применения миграции через GitHub Actions все счётчики и списки будут обновляться в реальном времени

---

## Результат

После применения миграции:
- Шильдик "Работа" будет обновляться при создании/удалении задач
- Контакты (аниматоры, клиенты, подрядчики, площадки) обновляются без перезагрузки
- Склад полностью синхронизируется в реальном времени
- Чеклисты и комментарии к задачам обновляются мгновенно
