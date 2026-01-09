-- Enable realtime for event_reports table (if not already enabled)
DO $$
BEGIN
  ALTER TABLE public.event_reports REPLICA IDENTITY FULL;
  
  -- Try to add to publication, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_reports;
  EXCEPTION WHEN others THEN
    NULL; -- Table already in publication
  END;
END $$;

-- Enable realtime for event_report_salaries table
DO $$
BEGIN
  ALTER TABLE public.event_report_salaries REPLICA IDENTITY FULL;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_report_salaries;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

-- Enable realtime for events table
DO $$
BEGIN
  ALTER TABLE public.events REPLICA IDENTITY FULL;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

-- Enable realtime for profiles table
DO $$
BEGIN
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

-- Enable realtime for vacations table
DO $$
BEGIN
  ALTER TABLE public.vacations REPLICA IDENTITY FULL;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vacations;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;