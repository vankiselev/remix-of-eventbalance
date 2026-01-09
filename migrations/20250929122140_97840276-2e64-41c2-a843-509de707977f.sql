-- Add salary_type column to event_report_salaries table
ALTER TABLE public.event_report_salaries 
ADD COLUMN salary_type text NOT NULL DEFAULT 'ЗП';

-- Remove notes column as requested
ALTER TABLE public.event_report_salaries 
DROP COLUMN notes;