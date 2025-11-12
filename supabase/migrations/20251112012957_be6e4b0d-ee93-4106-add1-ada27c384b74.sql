-- Add missing is_collected column to warehouse_task_items table
ALTER TABLE public.warehouse_task_items 
  ADD COLUMN is_collected BOOLEAN NOT NULL DEFAULT false;