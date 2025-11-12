-- Update warehouse task notification functions to use task_type instead of type

CREATE OR REPLACE FUNCTION public.notify_warehouse_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
  creator_name TEXT;
  task_label TEXT;
BEGIN
  -- Get names
  SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
  SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.created_by;

  -- Map task type to human label
  task_label := CASE NEW.task_type
    WHEN 'collection' THEN 'Собрать реквизит'
    WHEN 'return' THEN 'Вернуть реквизит'
    ELSE COALESCE(NEW.task_type, 'Задача склада')
  END;
  
  -- Notify assignee
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.assigned_to,
      'Новая задача склада',
      COALESCE(creator_name, 'Менеджер') || ' назначил(а) вам задачу: ' || task_label,
      'warehouse_task_assigned',
      jsonb_build_object('task_id', NEW.id, 'task_type', NEW.task_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_warehouse_task_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
  task_label TEXT;
BEGIN
  -- Notify creator when task completed
  IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
    SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;

    task_label := CASE NEW.task_type
      WHEN 'collection' THEN 'Собрать реквизит'
      WHEN 'return' THEN 'Вернуть реквизит'
      ELSE COALESCE(NEW.task_type, 'Задача склада')
    END;
    
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.created_by,
      'Задача склада выполнена',
      COALESCE(assignee_name, 'Исполнитель') || ' завершил(а) задачу: ' || task_label,
      'warehouse_task_completed',
      jsonb_build_object('task_id', NEW.id, 'task_type', NEW.task_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;