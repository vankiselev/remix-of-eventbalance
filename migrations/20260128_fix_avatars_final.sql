-- Final fix for avatars storage policies
-- Removes ALL conflicting policies and creates simple join-free ones

-- Dynamically drop all avatar-related policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        IF pol.policyname ILIKE '%avatar%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        END IF;
    END LOOP;
END $$;

-- Explicit drops by name for policies that might exist
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Ensure avatars bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Simple policies WITHOUT joins to other tables (prevents infinite recursion)

-- 1. SELECT - public access
CREATE POLICY "avatar_bucket_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. INSERT - own files only
-- Path format: USER_ID.jpg (filename starts with user's ID)
CREATE POLICY "avatar_bucket_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND storage.filename(name) LIKE (auth.uid()::text || '%')
);

-- 3. UPDATE - own files only
CREATE POLICY "avatar_bucket_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'))
WITH CHECK (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'));

-- 4. DELETE - own files only
CREATE POLICY "avatar_bucket_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'));
