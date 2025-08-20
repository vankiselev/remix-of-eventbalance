-- Add new fields to events table to match Google Sheets structure
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS holiday TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS managers TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS animators TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_program TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contractors TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photo_video TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_sheets_row_id TEXT;

-- Add index for better performance on archived items
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events(is_archived);

-- Add index for Google Sheets sync
CREATE INDEX IF NOT EXISTS idx_events_google_sheets_sync ON public.events(start_date, holiday);

-- Create sync status table
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_month TEXT NOT NULL,
  sync_year INTEGER NOT NULL,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  archived_count INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sync_status table
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Create policy for sync_status
CREATE POLICY "Users can view sync status" ON public.sync_status
FOR SELECT USING (true);

CREATE POLICY "Users can insert sync status" ON public.sync_status
FOR INSERT WITH CHECK (true);