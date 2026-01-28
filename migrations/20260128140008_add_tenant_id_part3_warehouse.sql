-- Phase 2: Add tenant_id to business tables (Part 3)
-- Warehouse, tasks, and other tables

BEGIN;

DO $$
DECLARE
  default_tenant_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN

  -- ============================================
  -- WAREHOUSE_CATEGORIES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'warehouse_categories' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.warehouse_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.warehouse_categories SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.warehouse_categories ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_categories_tenant ON public.warehouse_categories(tenant_id);
  END IF;

  -- ============================================
  -- WAREHOUSE_LOCATIONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'warehouse_locations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.warehouse_locations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.warehouse_locations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.warehouse_locations ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant ON public.warehouse_locations(tenant_id);
  END IF;

  -- ============================================
  -- WAREHOUSE_ITEMS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'warehouse_items' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.warehouse_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.warehouse_items SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.warehouse_items ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_items_tenant ON public.warehouse_items(tenant_id);
  END IF;

  -- ============================================
  -- WAREHOUSE_STOCK table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'warehouse_stock' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.warehouse_stock ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.warehouse_stock SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.warehouse_stock ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_stock_tenant ON public.warehouse_stock(tenant_id);
  END IF;

  -- ============================================
  -- WAREHOUSE_TASKS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'warehouse_tasks' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.warehouse_tasks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.warehouse_tasks SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.warehouse_tasks ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_tenant ON public.warehouse_tasks(tenant_id);
  END IF;

  -- ============================================
  -- TASKS table (CRM tasks)
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.tasks SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.tasks ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.tasks(tenant_id);
  END IF;

  -- ============================================
  -- VACATIONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.vacations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.vacations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.vacations ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_vacations_tenant ON public.vacations(tenant_id);
  END IF;

  -- ============================================
  -- NOTIFICATIONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.notifications SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    -- Allow NULL for system notifications
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
  END IF;

  -- ============================================
  -- INVITATIONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.invitations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.invitations ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.invitations(tenant_id);
  END IF;

  -- ============================================
  -- CATEGORY_ICONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'category_icons' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.category_icons ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.category_icons SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.category_icons ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_category_icons_tenant ON public.category_icons(tenant_id);
  END IF;

END $$;

COMMIT;
