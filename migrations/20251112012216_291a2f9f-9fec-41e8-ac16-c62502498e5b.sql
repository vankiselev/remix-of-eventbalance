-- Rename 'type' column to 'task_type' in warehouse_tasks table
-- This aligns the database schema with the application code

ALTER TABLE public.warehouse_tasks 
  RENAME COLUMN type TO task_type;