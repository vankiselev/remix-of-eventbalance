
-- Table for storing receipt verification results
CREATE TABLE IF NOT EXISTS public.receipt_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  
  -- Receipt requisites (from QR or manual input)
  fn text,           -- номер фискального накопителя
  fd text,           -- номер фискального документа
  fp text,           -- фискальный признак
  receipt_date timestamptz,
  receipt_sum numeric,
  operation_type smallint DEFAULT 1,  -- 1=приход, 2=возврат прихода, 3=расход, 4=возврат расхода
  
  -- QR data
  qr_raw text,       -- raw QR string
  qr_parsed boolean DEFAULT false,
  input_method text DEFAULT 'manual',  -- 'qr_scan', 'manual', 'qr_from_image'
  
  -- Verification status
  status text NOT NULL DEFAULT 'not_verified',
  -- Possible values: not_verified, verifying, verified_fns, not_found_fns, invalid_requisites, service_error, manual_review
  
  -- FNS response
  fns_response jsonb,
  fns_ticket_id text,
  fns_message_id text,
  fns_error_code text,
  fns_error_message text,
  
  -- Metadata
  verified_at timestamptz,
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  
  -- Manual review flag
  needs_manual_review boolean DEFAULT false,
  manual_review_comment text,
  manual_reviewed_by uuid,
  manual_reviewed_at timestamptz,
  
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_transaction ON public.receipt_verifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_status ON public.receipt_verifications(status);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_tenant ON public.receipt_verifications(tenant_id);

-- Enable RLS
ALTER TABLE public.receipt_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant members can read receipt_verifications"
  ON public.receipt_verifications FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can insert receipt_verifications"
  ON public.receipt_verifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NULL OR is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update receipt_verifications"
  ON public.receipt_verifications FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR is_tenant_member(tenant_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_verifications;
