-- Add estimate_file_url column to events table to store budget/estimate files
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS estimate_file_url text;

-- Create storage bucket for estimate files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('estimate-files', 'estimate-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for estimate files bucket
DROP POLICY IF EXISTS "Active users can view estimate files" ON storage.objects;
CREATE POLICY "Active users can view estimate files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'estimate-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Active users can upload estimate files" ON storage.objects;
CREATE POLICY "Active users can upload estimate files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'estimate-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can update their own estimate files" ON storage.objects;
CREATE POLICY "Users can update their own estimate files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'estimate-files' AND
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can delete estimate files" ON storage.objects;
CREATE POLICY "Users can delete estimate files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'estimate-files' AND
  auth.uid() IS NOT NULL
);