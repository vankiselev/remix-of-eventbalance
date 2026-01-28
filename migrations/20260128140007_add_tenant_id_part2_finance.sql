-- Phase 2: Add tenant_id to business tables (Part 2)
-- Financial and reporting tables

BEGIN;

DO $$
DECLARE
  default_tenant_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN

  -- ============================================
  -- FINANCIAL_TRANSACTIONS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'financial_transactions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.financial_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.financial_transactions SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.financial_transactions ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant ON public.financial_transactions(tenant_id);
  END IF;

  -- ============================================
  -- FINANCIAL_REPORTS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'financial_reports' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.financial_reports ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.financial_reports SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.financial_reports ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_financial_reports_tenant ON public.financial_reports(tenant_id);
  END IF;

  -- ============================================
  -- FINANCIAL_REPORT_ITEMS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'financial_report_items' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.financial_report_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.financial_report_items SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.financial_report_items ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_financial_report_items_tenant ON public.financial_report_items(tenant_id);
  END IF;

  -- ============================================
  -- EVENT_REPORTS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'event_reports' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.event_reports ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.event_reports SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.event_reports ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_event_reports_tenant ON public.event_reports(tenant_id);
  END IF;

  -- ============================================
  -- EVENT_REPORT_SALARIES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'event_report_salaries' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.event_report_salaries ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.event_report_salaries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.event_report_salaries ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_event_report_salaries_tenant ON public.event_report_salaries(tenant_id);
  END IF;

  -- ============================================
  -- EXPENSES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.expenses SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.expenses ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
  END IF;

  -- ============================================
  -- INCOMES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.incomes ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.incomes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.incomes ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_incomes_tenant ON public.incomes(tenant_id);
  END IF;

END $$;

COMMIT;
