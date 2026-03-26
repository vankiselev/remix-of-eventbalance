-- Receipt verification table for ФНС check verification
-- Idempotent migration for self-hosted

BEGIN;

CREATE TABLE IF NOT EXISTS public.receipt_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  fn text,
  fd text,
  fp text,
  receipt_date timestamptz,
  receipt_sum numeric,
  operation_type smallint DEFAULT 1,
  qr_raw text,
  qr_parsed boolean DEFAULT false,
  input_method text DEFAULT 'manual',
  status text NOT NULL DEFAULT 'not_verified',
  fns_response jsonb,
  fns_ticket_id text,
  fns_message_id text,
  fns_error_code text,
  fns_error_message text,
  verified_at timestamptz,
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  needs_manual_review boolean DEFAULT false,
  manual_review_comment text,
  manual_reviewed_by uuid,
  manual_reviewed_at timestamptz,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipt_verifications_transaction ON public.receipt_verifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_status ON public.receipt_verifications(status);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_tenant ON public.receipt_verifications(tenant_id);

ALTER TABLE public.receipt_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receipt_verifications' AND policyname = 'Tenant members can read receipt_verifications'
  ) THEN
    CREATE POLICY "Tenant members can read receipt_verifications"
      ON public.receipt_verifications FOR SELECT TO authenticated
      USING (tenant_id IS NULL OR is_tenant_member(tenant_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receipt_verifications' AND policyname = 'Tenant members can insert receipt_verifications'
  ) THEN
    CREATE POLICY "Tenant members can insert receipt_verifications"
      ON public.receipt_verifications FOR INSERT TO authenticated
      WITH CHECK (tenant_id IS NULL OR is_tenant_member(tenant_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receipt_verifications' AND policyname = 'Tenant members can update receipt_verifications'
  ) THEN
    CREATE POLICY "Tenant members can update receipt_verifications"
      ON public.receipt_verifications FOR UPDATE TO authenticated
      USING (tenant_id IS NULL OR is_tenant_member(tenant_id));
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_verifications;

COMMIT;
