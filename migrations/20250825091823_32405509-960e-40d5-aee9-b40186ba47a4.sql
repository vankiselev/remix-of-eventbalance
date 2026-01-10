-- Add receipt-related fields to financial_transactions
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS no_receipt boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS no_receipt_reason text;

-- Create financial_attachments table
CREATE TABLE IF NOT EXISTS public.financial_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on financial_attachments
ALTER TABLE public.financial_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_attachments
DROP POLICY IF EXISTS "Users can view their own attachments and admins can view all" ON public.financial_attachments;
CREATE POLICY "Users can view their own attachments and admins can view all"
ON public.financial_attachments
FOR SELECT
USING (
  (auth.uid() = created_by) OR
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

DROP POLICY IF EXISTS "Users can create their own attachments" ON public.financial_attachments;
CREATE POLICY "Users can create their own attachments"
ON public.financial_attachments
FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own attachments and admins can delete all" ON public.financial_attachments;
CREATE POLICY "Users can delete their own attachments and admins can delete all"
ON public.financial_attachments
FOR DELETE
USING (
  (auth.uid() = created_by) OR
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Create storage policies for receipts bucket
DROP POLICY IF EXISTS "Users can view their own receipts and admins can view all" ON storage.objects;
CREATE POLICY "Users can view their own receipts and admins can view all"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'receipts' AND
  (
    auth.uid()::text = (storage.foldername(name))[2] OR
    get_user_role(auth.uid()) = 'admin'::user_role
  )
);

DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

DROP POLICY IF EXISTS "Users can delete their own receipts and admins can delete all" ON storage.objects;
CREATE POLICY "Users can delete their own receipts and admins can delete all"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'receipts' AND
  (
    auth.uid()::text = (storage.foldername(name))[2] OR
    get_user_role(auth.uid()) = 'admin'::user_role
  )
);

-- Add trigger for updated_at on financial_attachments
CREATE TRIGGER update_financial_attachments_updated_at
BEFORE UPDATE ON public.financial_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_financial_attachments_transaction_id ON public.financial_attachments(transaction_id);
CREATE INDEX idx_financial_attachments_created_by ON public.financial_attachments(created_by);