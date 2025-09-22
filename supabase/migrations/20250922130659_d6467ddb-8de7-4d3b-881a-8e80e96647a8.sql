-- Add missing fields for import functionality
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS place text,
ADD COLUMN IF NOT EXISTS source_event_id uuid,
ADD COLUMN IF NOT EXISTS time_range text,
ADD COLUMN IF NOT EXISTS photo text,
ADD COLUMN IF NOT EXISTS video text;

-- Create unique index for upsert logic using existing columns
CREATE UNIQUE INDEX IF NOT EXISTS events_uniq_date_name
  ON public.events (start_date, lower(name));

-- Update existing photo_video data if needed (split to photo and video if contains data)
UPDATE public.events 
SET photo = photo_video, video = photo_video 
WHERE photo_video IS NOT NULL AND photo IS NULL AND video IS NULL;

-- Copy location to place if place is null
UPDATE public.events 
SET place = location 
WHERE location IS NOT NULL AND place IS NULL;