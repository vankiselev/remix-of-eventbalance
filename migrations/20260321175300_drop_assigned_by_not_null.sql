-- Drop assigned_by NOT NULL constraint or column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'event_report_salaries' 
    AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE public.event_report_salaries DROP COLUMN assigned_by;
  END IF;
END$$;
