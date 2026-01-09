-- Add car-related fields to event_reports table
ALTER TABLE public.event_reports 
ADD COLUMN car_time text,
ADD COLUMN without_car boolean DEFAULT false;