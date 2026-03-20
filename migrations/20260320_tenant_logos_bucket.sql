-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can view tenant logos
DROP POLICY IF EXISTS "Tenant logos are publicly accessible" ON storage.objects;
CREATE POLICY "Tenant logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tenant-logos');

-- Authenticated users can upload tenant logos
DROP POLICY IF EXISTS "Authenticated users can upload tenant logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload tenant logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tenant-logos' AND auth.role() = 'authenticated');

-- Authenticated users can update tenant logos
DROP POLICY IF EXISTS "Authenticated users can update tenant logos" ON storage.objects;
CREATE POLICY "Authenticated users can update tenant logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'tenant-logos' AND auth.role() = 'authenticated');

-- Authenticated users can delete tenant logos
DROP POLICY IF EXISTS "Authenticated users can delete tenant logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete tenant logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'tenant-logos' AND auth.role() = 'authenticated');
