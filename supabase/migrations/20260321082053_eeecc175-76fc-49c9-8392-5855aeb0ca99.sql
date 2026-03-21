-- Add unique constraint for upsert on event_report_salaries
ALTER TABLE public.event_report_salaries
  ADD CONSTRAINT uq_report_employee UNIQUE (report_id, employee_user_id);