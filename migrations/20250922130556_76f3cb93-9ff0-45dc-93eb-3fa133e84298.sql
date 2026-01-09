-- Create or update events table for import functionality
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  title text NOT NULL,
  project_owner text,
  managers text,
  place text,
  time_range text,
  animators text,
  show_program text,
  contractors text,
  photo text,
  video text,
  notes text,
  source_event_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index for upsert logic
CREATE UNIQUE INDEX IF NOT EXISTS events_uniq_date_title
  ON public.events (event_date, lower(title));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS trigger AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_events_updated ON public.events;
CREATE TRIGGER trg_events_updated 
  BEFORE UPDATE ON public.events
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "events_select" ON public.events 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "events_insert" ON public.events 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "events_update" ON public.events 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "events_delete" ON public.events 
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR get_current_user_role() = 'admin'::user_role);