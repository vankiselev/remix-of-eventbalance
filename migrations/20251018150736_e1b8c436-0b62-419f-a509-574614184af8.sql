-- Make estimate-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'estimate-files';