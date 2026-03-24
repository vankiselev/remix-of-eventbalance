-- Add unique constraint on tenant_memberships(tenant_id, user_id) for upsert support
-- This is required by the register-invited-user edge function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenant_memberships'::regclass
    AND conname = 'tenant_memberships_tenant_id_user_id_key'
  ) THEN
    ALTER TABLE public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_user_id_key UNIQUE (tenant_id, user_id);
  END IF;
END $$;
