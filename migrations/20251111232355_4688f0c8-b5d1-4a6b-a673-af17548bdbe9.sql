-- ============================================================================
-- WAREHOUSE MANAGEMENT SYSTEM - COMPLETE MIGRATION
-- ============================================================================

-- Enable required extensions for notifications
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Warehouse Categories
CREATE TABLE IF NOT EXISTS public.warehouse_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_type TEXT NOT NULL DEFAULT 'lucide',
  icon_value TEXT NOT NULL DEFAULT 'Package',
  bg_color TEXT NOT NULL DEFAULT 'bg-gray-500/10',
  icon_color TEXT NOT NULL DEFAULT 'text-gray-600 dark:text-gray-400',
  parent_id UUID REFERENCES public.warehouse_categories(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Locations
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'warehouse',
  address TEXT,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Items
CREATE TABLE IF NOT EXISTS public.warehouse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.warehouse_categories(id) ON DELETE SET NULL,
  sku TEXT,
  barcode TEXT,
  unit TEXT NOT NULL DEFAULT 'шт',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Stock
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.warehouse_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- Warehouse Movements
CREATE TABLE IF NOT EXISTS public.warehouse_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.warehouse_items(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  movement_type TEXT NOT NULL,
  operation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  photo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Tasks
CREATE TABLE IF NOT EXISTS public.warehouse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Task Items
CREATE TABLE IF NOT EXISTS public.warehouse_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.warehouse_tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.warehouse_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  collected_quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Task Comments
CREATE TABLE IF NOT EXISTS public.warehouse_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.warehouse_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Warehouse Settings
CREATE TABLE IF NOT EXISTS public.warehouse_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_notifications BOOLEAN NOT NULL DEFAULT true,
  notify_on_low_stock BOOLEAN NOT NULL DEFAULT true,
  notify_on_task_assigned BOOLEAN NOT NULL DEFAULT true,
  notify_on_task_due BOOLEAN NOT NULL DEFAULT true,
  notify_on_overdue_return BOOLEAN NOT NULL DEFAULT true,
  return_reminder_days INTEGER NOT NULL DEFAULT 1,
  low_stock_threshold_percent INTEGER NOT NULL DEFAULT 20,
  default_currency TEXT NOT NULL DEFAULT 'RUB',
  default_unit TEXT NOT NULL DEFAULT 'шт',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_warehouse_items_category ON public.warehouse_items(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_active ON public.warehouse_items(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item ON public.warehouse_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_location ON public.warehouse_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_item ON public.warehouse_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_date ON public.warehouse_movements(operation_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_status ON public.warehouse_tasks(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_assigned ON public.warehouse_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_event ON public.warehouse_tasks(event_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_warehouse_categories_updated_at ON public.warehouse_categories;
DROP TRIGGER IF EXISTS update_warehouse_locations_updated_at ON public.warehouse_locations;
DROP TRIGGER IF EXISTS update_warehouse_items_updated_at ON public.warehouse_items;
DROP TRIGGER IF EXISTS update_warehouse_tasks_updated_at ON public.warehouse_tasks;
DROP TRIGGER IF EXISTS update_warehouse_settings_updated_at ON public.warehouse_settings;
DROP TRIGGER IF EXISTS on_warehouse_task_created ON public.warehouse_tasks;
DROP TRIGGER IF EXISTS on_warehouse_task_status_changed ON public.warehouse_tasks;
DROP TRIGGER IF EXISTS on_warehouse_task_comment_added ON public.warehouse_task_comments;

-- Update timestamps
CREATE TRIGGER update_warehouse_categories_updated_at
  BEFORE UPDATE ON public.warehouse_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_items_updated_at
  BEFORE UPDATE ON public.warehouse_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_tasks_updated_at
  BEFORE UPDATE ON public.warehouse_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_settings_updated_at
  BEFORE UPDATE ON public.warehouse_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_warehouse_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
  creator_name TEXT;
BEGIN
  -- Get names
  SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
  SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.created_by;
  
  -- Notify assignee
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.assigned_to,
      'Новая задача склада',
      COALESCE(creator_name, 'Менеджер') || ' назначил(а) вам задачу: ' || 
      CASE NEW.type 
        WHEN 'collect' THEN 'Собрать реквизит'
        WHEN 'return' THEN 'Вернуть реквизит'
        ELSE NEW.type
      END,
      'warehouse_task_assigned',
      jsonb_build_object('task_id', NEW.id, 'task_type', NEW.type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_warehouse_task_created
  AFTER INSERT ON public.warehouse_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_warehouse_task_created();

CREATE OR REPLACE FUNCTION public.notify_warehouse_task_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
BEGIN
  -- Notify creator when task completed
  IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
    SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
    
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.created_by,
      'Задача склада выполнена',
      COALESCE(assignee_name, 'Исполнитель') || ' завершил(а) задачу: ' ||
      CASE NEW.type 
        WHEN 'collect' THEN 'Собрать реквизит'
        WHEN 'return' THEN 'Вернуть реквизит'
        ELSE NEW.type
      END,
      'warehouse_task_completed',
      jsonb_build_object('task_id', NEW.id, 'task_type', NEW.type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_warehouse_task_status_changed
  AFTER UPDATE ON public.warehouse_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_warehouse_task_status_changed();

CREATE OR REPLACE FUNCTION public.notify_warehouse_task_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record warehouse_tasks%ROWTYPE;
  commenter_name TEXT;
  notify_user_id UUID;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM warehouse_tasks WHERE id = NEW.task_id;
  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Notify task creator if they're not the commenter
  IF task_record.created_by != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      task_record.created_by,
      'Новый комментарий к задаче',
      COALESCE(commenter_name, 'Пользователь') || ' добавил(а) комментарий к задаче склада',
      'warehouse_task_comment',
      jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
    );
  END IF;
  
  -- Notify assignee if they're not the commenter
  IF task_record.assigned_to IS NOT NULL AND task_record.assigned_to != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      task_record.assigned_to,
      'Новый комментарий к задаче',
      COALESCE(commenter_name, 'Пользователь') || ' добавил(а) комментарий к задаче склада',
      'warehouse_task_comment',
      jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_warehouse_task_comment_added
  AFTER INSERT ON public.warehouse_task_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_warehouse_task_comment();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.warehouse_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_settings ENABLE ROW LEVEL SECURITY;

-- Categories Policies
DROP POLICY IF EXISTS "Active users can view categories" ON public.warehouse_categories;
CREATE POLICY "Active users can view categories"
  ON public.warehouse_categories FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Users with permission can manage categories" ON public.warehouse_categories;
CREATE POLICY "Users with permission can manage categories"
  ON public.warehouse_categories FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Locations Policies
DROP POLICY IF EXISTS "Active users can view locations" ON public.warehouse_locations;
CREATE POLICY "Active users can view locations"
  ON public.warehouse_locations FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Users with permission can manage locations" ON public.warehouse_locations;
CREATE POLICY "Users with permission can manage locations"
  ON public.warehouse_locations FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Items Policies
DROP POLICY IF EXISTS "Active users can view items" ON public.warehouse_items;
CREATE POLICY "Active users can view items"
  ON public.warehouse_items FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Users with permission can manage items" ON public.warehouse_items;
CREATE POLICY "Users with permission can manage items"
  ON public.warehouse_items FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Stock Policies
DROP POLICY IF EXISTS "Active users can view stock" ON public.warehouse_stock;
CREATE POLICY "Active users can view stock"
  ON public.warehouse_stock FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Users with permission can manage stock" ON public.warehouse_stock;
CREATE POLICY "Users with permission can manage stock"
  ON public.warehouse_stock FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Movements Policies
DROP POLICY IF EXISTS "Active users can view movements" ON public.warehouse_movements;
CREATE POLICY "Active users can view movements"
  ON public.warehouse_movements FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Active users can create movements" ON public.warehouse_movements;
CREATE POLICY "Active users can create movements"
  ON public.warehouse_movements FOR INSERT
  WITH CHECK (is_active_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Users with permission can manage movements" ON public.warehouse_movements;
CREATE POLICY "Users with permission can manage movements"
  ON public.warehouse_movements FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Tasks Policies
DROP POLICY IF EXISTS "Active users can view tasks" ON public.warehouse_tasks;
CREATE POLICY "Active users can view tasks"
  ON public.warehouse_tasks FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Active users can create tasks" ON public.warehouse_tasks;
CREATE POLICY "Active users can create tasks"
  ON public.warehouse_tasks FOR INSERT
  WITH CHECK (is_active_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Assigned users can update their tasks" ON public.warehouse_tasks;
CREATE POLICY "Assigned users can update their tasks"
  ON public.warehouse_tasks FOR UPDATE
  USING (auth.uid() = assigned_to OR auth.uid() = created_by OR has_permission('warehouse.manage_tasks') OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users with permission can manage tasks" ON public.warehouse_tasks;
CREATE POLICY "Users with permission can manage tasks"
  ON public.warehouse_tasks FOR ALL
  USING (has_permission('warehouse.manage_tasks') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_tasks') OR is_admin_user(auth.uid()));

-- Task Items Policies
DROP POLICY IF EXISTS "Active users can view task items" ON public.warehouse_task_items;
CREATE POLICY "Active users can view task items"
  ON public.warehouse_task_items FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Users with permission can manage task items" ON public.warehouse_task_items;
CREATE POLICY "Users with permission can manage task items"
  ON public.warehouse_task_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM warehouse_tasks
      WHERE id = warehouse_task_items.task_id
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    ) OR has_permission('warehouse.manage_tasks') OR is_admin_user(auth.uid())
  );

-- Task Comments Policies
DROP POLICY IF EXISTS "Active users can view task comments" ON public.warehouse_task_comments;
CREATE POLICY "Active users can view task comments"
  ON public.warehouse_task_comments FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Active users can create task comments" ON public.warehouse_task_comments;
CREATE POLICY "Active users can create task comments"
  ON public.warehouse_task_comments FOR INSERT
  WITH CHECK (is_active_user() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.warehouse_task_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.warehouse_task_comments FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

-- Settings Policies
DROP POLICY IF EXISTS "Active users can view settings" ON public.warehouse_settings;
CREATE POLICY "Active users can view settings"
  ON public.warehouse_settings FOR SELECT
  USING (is_active_user());

DROP POLICY IF EXISTS "Admins can manage settings" ON public.warehouse_settings;
CREATE POLICY "Admins can manage settings"
  ON public.warehouse_settings FOR ALL
  USING (has_permission('warehouse.manage_settings') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_settings') OR is_admin_user(auth.uid()));

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('warehouse-photos', 'warehouse-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public can view warehouse photos" ON storage.objects;
CREATE POLICY "Public can view warehouse photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'warehouse-photos');

DROP POLICY IF EXISTS "Authenticated users can upload warehouse photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload warehouse photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'warehouse-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update their own warehouse photos" ON storage.objects;
CREATE POLICY "Users can update their own warehouse photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'warehouse-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their own warehouse photos" ON storage.objects;
CREATE POLICY "Users can delete their own warehouse photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'warehouse-photos'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (code, name, description, category)
VALUES
  ('warehouse.view', 'Просмотр склада', 'Просмотр товаров, остатков и движений склада', 'Склад'),
  ('warehouse.manage_items', 'Управление товарами', 'Создание, редактирование и удаление товаров, категорий и локаций', 'Склад'),
  ('warehouse.manage_tasks', 'Управление задачами', 'Создание и управление задачами склада (сбор и возврат реквизита)', 'Склад'),
  ('warehouse.manage_settings', 'Настройки склада', 'Управление настройками склада и уведомлений', 'Склад')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Default category
INSERT INTO public.warehouse_categories (name, icon_type, icon_value, bg_color, icon_color, display_order)
VALUES ('Без категории', 'lucide', 'Package', 'bg-gray-500/10', 'text-gray-600 dark:text-gray-400', 0)
ON CONFLICT DO NOTHING;

-- Default location
INSERT INTO public.warehouse_locations (name, type, display_order)
VALUES ('Основной склад', 'warehouse', 0)
ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO public.warehouse_settings (
  enable_notifications,
  notify_on_low_stock,
  notify_on_task_assigned,
  notify_on_task_due,
  notify_on_overdue_return,
  return_reminder_days,
  low_stock_threshold_percent,
  default_currency,
  default_unit
)
VALUES (true, true, true, true, true, 1, 20, 'RUB', 'шт')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CRON JOB FOR WAREHOUSE NOTIFICATIONS
-- ============================================================================

-- Schedule daily warehouse notifications at 9:00 AM
SELECT cron.schedule(
  'warehouse-daily-notifications',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wpxhmajdeunabximyfln.supabase.co/functions/v1/warehouse-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweGhtYWpkZXVuYWJ4aW15ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTM1MTEsImV4cCI6MjA3MTA4OTUxMX0.urAxl_XVwNggHZ1SuwlFFRzuRJSOHAHW038S57YDFzk"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);