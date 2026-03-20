-- Add middle_name column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'middle_name') THEN
    ALTER TABLE public.profiles ADD COLUMN middle_name text;
  END IF;
END $$;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars
CREATE POLICY IF NOT EXISTS "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY IF NOT EXISTS "Public can read avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY IF NOT EXISTS "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY IF NOT EXISTS "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');
