-- ========================================
-- ЭТАП 1: Расширение таблицы warehouse_locations
-- ========================================

-- Добавляем поля для детального размещения товаров
ALTER TABLE warehouse_locations
ADD COLUMN floor text,
ADD COLUMN rack text,
ADD COLUMN shelf text,
ADD COLUMN cell text;

-- Индекс для быстрого поиска по размещению
CREATE INDEX idx_warehouse_locations_placement 
ON warehouse_locations(floor, rack, shelf, cell);

COMMENT ON COLUMN warehouse_locations.floor IS 'Этаж склада';
COMMENT ON COLUMN warehouse_locations.rack IS 'Стеллаж';
COMMENT ON COLUMN warehouse_locations.shelf IS 'Полка';
COMMENT ON COLUMN warehouse_locations.cell IS 'Ячейка';

-- ========================================
-- ЭТАП 3: Система истории изменений (Audit Log)
-- ========================================

-- Создаём таблицу для аудита изменений товаров
CREATE TABLE warehouse_items_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES warehouse_items(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  change_description text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Индексы для быстрого поиска
CREATE INDEX idx_warehouse_audit_item ON warehouse_items_audit_log(item_id, changed_at DESC);
CREATE INDEX idx_warehouse_audit_user ON warehouse_items_audit_log(changed_by, changed_at DESC);
CREATE INDEX idx_warehouse_audit_action ON warehouse_items_audit_log(action, changed_at DESC);

-- RLS политики для аудит-лога
ALTER TABLE warehouse_items_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view audit logs"
ON warehouse_items_audit_log FOR SELECT
USING (is_active_user());

CREATE POLICY "System can insert audit logs"
ON warehouse_items_audit_log FOR INSERT
WITH CHECK (true);

-- Функция для автоматического логирования изменений
CREATE OR REPLACE FUNCTION log_warehouse_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array text[];
  old_json jsonb;
  new_json jsonb;
  description_text text;
BEGIN
  -- Определяем изменённые поля
  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(key) INTO changed_fields_array
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key;
    
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Формируем описание изменений
    IF changed_fields_array && ARRAY['is_active'] AND NEW.is_active = false THEN
      description_text := 'Товар деактивирован';
    ELSIF changed_fields_array && ARRAY['is_active'] AND NEW.is_active = true THEN
      description_text := 'Товар восстановлен';
    ELSE
      description_text := 'Обновлены поля: ' || array_to_string(changed_fields_array, ', ');
    END IF;
    
  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    description_text := 'Создан новый товар';
    
  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    description_text := 'Товар удалён';
  END IF;

  -- Записываем в audit log
  INSERT INTO warehouse_items_audit_log (
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
    LOWER(TG_OP),
    old_json,
    new_json,
    changed_fields_array,
    description_text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаём триггер на таблицу warehouse_items
CREATE TRIGGER warehouse_items_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON warehouse_items
FOR EACH ROW EXECUTE FUNCTION log_warehouse_item_changes();