-- Ensure avatars bucket exists and set permissive RLS for avatar uploads
BEGIN;

-- 1) Make sure the 'avatars' bucket exists and is public
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
  ELSE
    -- Ensure it is public
    UPDATE storage.buckets SET public = true WHERE id = 'avatars';
  END IF;
END;$$;

-- 2) Reset related policies to avoid duplicates
DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;

-- 3) Public read for avatars (so URLs work without auth)
CREATE POLICY "Avatar images are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- 4) Users can upload/update/delete only inside their own folder: <user_id>/...
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5) Admins can manage all avatars
CREATE POLICY "Admins can manage all avatars"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'avatars' AND public.get_current_user_role() = 'admin'::user_role
)
WITH CHECK (
  bucket_id = 'avatars' AND public.get_current_user_role() = 'admin'::user_role
);

COMMIT;