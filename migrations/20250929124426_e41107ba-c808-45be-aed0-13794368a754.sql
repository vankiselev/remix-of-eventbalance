-- Change car_time to car_kilometers for distance tracking
ALTER TABLE public.event_reports 
DROP COLUMN car_time,
ADD COLUMN car_kilometers numeric;