-- Добавить поле items в таблицу tasks для хранения товаров (складские задачи)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]';

-- Добавить комментарий для документации
COMMENT ON COLUMN public.tasks.items IS 'Массив товаров для складских задач (collection/return). Структура: [{item_id, item_name, quantity, collected_quantity, is_collected}]';

-- Миграция существующих складских задач в unified tasks
INSERT INTO public.tasks (
  title,
  description,
  task_type,
  priority,
  status,
  assigned_to,
  created_by,
  event_id,
  due_date,
  completed_at,
  created_at,
  updated_at,
  items
)
SELECT
  CASE
    WHEN wt.type = 'collection' THEN 'Сбор реквизита'
    ELSE 'Возврат реквизита'
  END || COALESCE(': ' || e.title, '') as title,
  wt.notes as description,
  wt.type as task_type,
  'medium' as priority,
  wt.status,
  wt.assigned_to,
  wt.created_by,
  wt.event_id,
  wt.due_date,
  wt.completed_at,
  wt.created_at,
  wt.updated_at,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_id', wti.item_id,
          'item_name', COALESCE(wi.name, 'Неизвестный товар'),
          'quantity', wti.quantity,
          'collected_quantity', wti.collected_quantity,
          'is_collected', (wti.collected_quantity >= wti.quantity),
          'notes', wti.notes
        )
      )
      FROM warehouse_task_items wti
      LEFT JOIN warehouse_items wi ON wti.item_id = wi.id
      WHERE wti.task_id = wt.id
    ),
    '[]'::jsonb
  ) as items
FROM warehouse_tasks wt
LEFT JOIN events e ON wt.event_id = e.id;

-- Миграция комментариев из warehouse_task_comments в task_comments
INSERT INTO public.task_comments (
  task_id,
  user_id,
  comment,
  attachment_url,
  created_at
)
SELECT 
  t.id as task_id,
  wtc.user_id,
  wtc.comment,
  wtc.photo_url as attachment_url,
  wtc.created_at
FROM warehouse_task_comments wtc
JOIN warehouse_tasks wt ON wtc.task_id = wt.id
JOIN tasks t ON t.event_id = wt.event_id
  AND t.task_type = wt.type
  AND t.created_at = wt.created_at;