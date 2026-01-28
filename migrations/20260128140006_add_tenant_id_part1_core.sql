-- Phase 2: Add tenant_id to core business tables (Part 1)
-- This migration adds tenant_id column to high-priority tables

BEGIN;

-- Store default tenant ID for reference
DO $$
DECLARE
  default_tenant_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN

  -- ============================================
  -- CLIENTS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.clients SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.clients ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
  END IF;

  -- ============================================
  -- ANIMATORS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'animators' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.animators ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.animators SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.animators ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_animators_tenant ON public.animators(tenant_id);
  END IF;

  -- ============================================
  -- CONTRACTORS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contractors' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.contractors ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.contractors SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.contractors ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_contractors_tenant ON public.contractors(tenant_id);
  END IF;

  -- ============================================
  -- VENUES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.venues SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.venues ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_venues_tenant ON public.venues(tenant_id);
  END IF;

  -- ============================================
  -- EVENTS table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.events SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.events ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_tenant ON public.events(tenant_id);
  END IF;

  -- ============================================
  -- EMPLOYEES table
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    UPDATE public.employees SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE public.employees ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
  END IF;

END $$;

COMMIT;
