-- Удаляем старые неправильные политики для receipts
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts and admins can view all" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts and admins can delete all" ON storage.objects;

-- Создаем правильные политики для receipts bucket
CREATE POLICY "Users can upload their own receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own receipts and admins can view all" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'receipts' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR get_user_role(auth.uid()) = 'admin'::user_role
  )
);

CREATE POLICY "Users can delete their own receipts and admins can delete all" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receipts' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR get_user_role(auth.uid()) = 'admin'::user_role
  )
);