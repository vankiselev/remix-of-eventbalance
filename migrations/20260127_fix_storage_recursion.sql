-- Fix infinite recursion in storage policies
-- The issue is that some policies reference chat_participants which causes recursion

-- First, drop ALL existing policies on storage.objects for avatars bucket
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (policyname LIKE '%avatar%' OR policyname LIKE '%Avatar%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Also drop any policies that might be causing the recursion via chat_participants
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

-- Ensure avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create simple policies that do NOT reference any other tables
-- This prevents infinite recursion

-- Anyone can view avatars (bucket is public anyway)
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload to avatars bucket
-- Path check: file name must start with user's ID
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND name ~ ('^' || auth.uid()::text)
);

-- Authenticated users can update their own avatars
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name ~ ('^' || auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND name ~ ('^' || auth.uid()::text)
);

-- Authenticated users can delete their own avatars
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name ~ ('^' || auth.uid()::text)
);
