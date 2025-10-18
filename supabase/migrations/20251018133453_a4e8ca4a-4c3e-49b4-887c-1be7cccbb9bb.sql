-- Add new columns to events table for better relational structure
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS animator_ids uuid[],
ADD COLUMN IF NOT EXISTS contractor_ids uuid[],
ADD COLUMN IF NOT EXISTS manager_ids uuid[],
ADD COLUMN IF NOT EXISTS responsible_manager_ids uuid[],
ADD COLUMN IF NOT EXISTS photographer_contact_id uuid,
ADD COLUMN IF NOT EXISTS videographer_contact_id uuid;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_animator_ids ON public.events USING GIN(animator_ids);
CREATE INDEX IF NOT EXISTS idx_events_contractor_ids ON public.events USING GIN(contractor_ids);
CREATE INDEX IF NOT EXISTS idx_events_manager_ids ON public.events USING GIN(manager_ids);

-- Add comments for documentation
COMMENT ON COLUMN public.events.venue_id IS 'Reference to venues table';
COMMENT ON COLUMN public.events.animator_ids IS 'Array of animator IDs';
COMMENT ON COLUMN public.events.contractor_ids IS 'Array of contractor IDs';
COMMENT ON COLUMN public.events.manager_ids IS 'Array of manager (employee) IDs';
COMMENT ON COLUMN public.events.photographer_contact_id IS 'Contact ID for photographer';
COMMENT ON COLUMN public.events.videographer_contact_id IS 'Contact ID for videographer';