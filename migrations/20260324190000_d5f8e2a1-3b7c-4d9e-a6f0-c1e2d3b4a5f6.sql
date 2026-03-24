-- Fix get_invitation_by_token: use plpgsql for late binding (avoids uuid=text type error)
-- Fix invitation_audit_log action check constraint to allow all actions
-- Idempotent

-- 1. Recreate RPC with plpgsql (handles both uuid and text token columns)
DROP FUNCTION IF EXISTS public.get_invitation_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamp with time zone,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email::text,
    i.role::text,
    i.expires_at,
    i.status::text
  FROM public.invitations i
  WHERE i.token::text = invitation_token 
    AND i.status IN ('pending', 'sent', 'accepted')
    AND (i.status = 'accepted' OR i.expires_at > now())
  LIMIT 1;
END;
$$;

-- 2. Fix invitation_audit_log action check constraint (if exists)
DO $$
BEGIN
  -- Drop any check constraint on action column
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.invitation_audit_log'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%action%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.invitation_audit_log DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.invitation_audit_log'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%action%'
      LIMIT 1
    );
  END IF;
END $$;

-- 3. Ensure anon RLS policy for invite page validation
DROP POLICY IF EXISTS "Anon can read invitations by token" ON public.invitations;
CREATE POLICY "Anon can read invitations by token"
ON public.invitations FOR SELECT TO anon
USING (status IN ('pending', 'sent', 'accepted'));
