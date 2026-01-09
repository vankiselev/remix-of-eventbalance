-- Add responsible_manager_id field to events table
ALTER TABLE public.events ADD COLUMN responsible_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_events_responsible_manager_id ON public.events(responsible_manager_id);