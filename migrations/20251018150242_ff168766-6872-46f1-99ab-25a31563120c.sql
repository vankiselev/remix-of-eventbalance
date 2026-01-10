-- Add client_id field to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_client_id ON public.events(client_id);