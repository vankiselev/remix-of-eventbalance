-- Add end_time field to events table
ALTER TABLE public.events ADD COLUMN end_time time without time zone;