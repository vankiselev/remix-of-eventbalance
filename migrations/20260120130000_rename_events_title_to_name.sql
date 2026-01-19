-- Rename 'title' column back to 'name' to match application code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.events RENAME COLUMN title TO name;
  END IF;
END $$;

-- Update the unique index to use 'name' instead of 'title'
DROP INDEX IF EXISTS events_uniq_date_title;
CREATE UNIQUE INDEX IF NOT EXISTS events_uniq_date_name
  ON public.events (start_date, lower(name));
