-- Fix avatars storage bucket policies
-- Remove any policies that might cause recursion

-- First, ensure avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies for avatars bucket to start fresh
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

-- Simple policies that don't reference other tables (no recursion possible)

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload to avatars bucket
-- Only allow uploading to avatars/[user_id].* path
CREATE POLICY "avatars_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.filename(name) LIKE auth.uid()::text || '.%' OR (storage.foldername(name))[2] = auth.uid()::text)
);

-- Authenticated users can update their own avatars
CREATE POLICY "avatars_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.filename(name) LIKE auth.uid()::text || '.%' OR (storage.foldername(name))[2] = auth.uid()::text)
);

-- Authenticated users can delete their own avatars
CREATE POLICY "avatars_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.filename(name) LIKE auth.uid()::text || '.%' OR (storage.foldername(name))[2] = auth.uid()::text)
);
