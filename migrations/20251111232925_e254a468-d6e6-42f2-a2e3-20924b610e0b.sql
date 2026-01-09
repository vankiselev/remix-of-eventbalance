-- Fix foreign key constraints for warehouse_tasks
-- This will stop the infinite failed requests

-- First, drop the incorrect constraints if they exist
ALTER TABLE public.warehouse_tasks 
  DROP CONSTRAINT IF EXISTS warehouse_tasks_assigned_to_fkey;

ALTER TABLE public.warehouse_tasks 
  DROP CONSTRAINT IF EXISTS warehouse_tasks_created_by_fkey;

-- Add correct foreign key constraints linking to auth.users
ALTER TABLE public.warehouse_tasks 
  ADD CONSTRAINT warehouse_tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE public.warehouse_tasks 
  ADD CONSTRAINT warehouse_tasks_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;