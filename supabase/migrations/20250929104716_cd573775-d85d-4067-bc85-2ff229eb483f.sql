-- Allow users to insert their own financial audit logs while keeping logs readable only by admins
-- This fixes RLS error when creating/updating transactions that attempt to write to financial_audit_log

-- Ensure RLS is enabled (harmless if already enabled)
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow INSERTs from authenticated users for their own logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'financial_audit_log' 
      AND policyname = 'Users can insert their own financial audit logs'
  ) THEN
    CREATE POLICY "Users can insert their own financial audit logs"
    ON public.financial_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = changed_by);
  END IF;
END$$;