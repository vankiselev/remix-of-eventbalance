-- Fix audit log action mismatch: map TG_OP to allowed values ('create','update','delete','restore')
-- Update the log_warehouse_item_changes function
CREATE OR REPLACE FUNCTION public.log_warehouse_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array text[] := ARRAY[]::text[];
  old_json jsonb;
  new_json jsonb;
  description_text text;
  action_text text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(ARRAY_AGG(key), ARRAY[]::text[]) INTO changed_fields_array
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key;

    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);

    -- Determine action based on is_active changes or generic update
    IF changed_fields_array && ARRAY['is_active'] THEN
      IF NEW.is_active = false THEN
        description_text := 'Товар деактивирован';
        action_text := 'delete'; -- logical delete
      ELSE
        description_text := 'Товар восстановлен';
        action_text := 'restore';
      END IF;
    ELSE
      description_text := 'Обновлены поля: ' || array_to_string(changed_fields_array, ', ');
      action_text := 'update';
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    description_text := 'Создан новый товар';
    action_text := 'create';

  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    description_text := 'Товар удалён';
    action_text := 'delete';
  END IF;

  -- Write audit log
  INSERT INTO public.warehouse_items_audit_log (
    item_id,
    changed_by,
    action,
    old_data,
    new_data,
    changed_fields,
    change_description
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    action_text,
    old_json,
    new_json,
    changed_fields_array,
    description_text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;