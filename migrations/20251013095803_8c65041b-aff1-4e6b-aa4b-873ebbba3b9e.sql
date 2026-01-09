BEGIN;

-- Update storage policies to allow paths like "<uid>.jpg" or "avatars/<uid>.jpg" or with subfolders under these prefixes
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Common predicate for user-owned avatar object names
-- Allows: "<uid>...", "<uid>/...", "avatars/<uid>...", "avatars/<uid>/..."
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND (
    name ILIKE auth.uid()::text || '%' OR
    name ILIKE auth.uid()::text || '/%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '/%'
  )
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND (
    name ILIKE auth.uid()::text || '%' OR
    name ILIKE auth.uid()::text || '/%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '/%'
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND (
    name ILIKE auth.uid()::text || '%' OR
    name ILIKE auth.uid()::text || '/%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '/%'
  )
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND (
    name ILIKE auth.uid()::text || '%' OR
    name ILIKE auth.uid()::text || '/%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '%' OR
    name ILIKE 'avatars/' || auth.uid()::text || '/%'
  )
);

COMMIT;