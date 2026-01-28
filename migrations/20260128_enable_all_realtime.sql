-- Enable REPLICA IDENTITY FULL for all tables (required for realtime with RLS)
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

-- Add tables to realtime publication (with error handling for duplicates)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.animators;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contractors;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.category_icons;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_stock;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklists;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
