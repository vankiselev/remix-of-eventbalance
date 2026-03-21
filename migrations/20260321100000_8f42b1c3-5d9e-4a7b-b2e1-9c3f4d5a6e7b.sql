-- Add missing car-related columns to event_reports
ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS car_kilometers numeric;
ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS without_car boolean DEFAULT false;
