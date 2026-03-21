-- 1. Create resolve_transfer_recipient RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.resolve_transfer_recipient(
  p_selected_id uuid,
  p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resolved_uid uuid;
BEGIN
  -- First: check if p_selected_id is directly a tenant_memberships.user_id (auth uid)
  SELECT tm.user_id INTO resolved_uid
  FROM public.tenant_memberships tm
  WHERE tm.user_id = p_selected_id
    AND tm.tenant_id = p_tenant_id
  LIMIT 1;

  IF resolved_uid IS NOT NULL THEN
    RETURN resolved_uid;
  END IF;

  -- Second: check if p_selected_id is a profiles.id, and map via profiles.user_id
  BEGIN
    SELECT tm.user_id INTO resolved_uid
    FROM public.profiles p
    JOIN public.tenant_memberships tm ON tm.user_id = p.user_id
    WHERE p.id = p_selected_id
      AND tm.tenant_id = p_tenant_id
    LIMIT 1;

    IF resolved_uid IS NOT NULL THEN
      RETURN resolved_uid;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- user_id column doesn't exist, skip
    NULL;
  END;

  -- Third: check if p_selected_id is profiles.id where id = user_id (Lovable Cloud style)
  SELECT tm.user_id INTO resolved_uid
  FROM public.profiles p
  JOIN public.tenant_memberships tm ON tm.user_id = p.id
  WHERE p.id = p_selected_id
    AND tm.tenant_id = p_tenant_id
  LIMIT 1;

  IF resolved_uid IS NOT NULL THEN
    RETURN resolved_uid;
  END IF;

  RETURN NULL;
END;
$$;

-- 2. Create or replace notify_money_transfer RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.notify_money_transfer(
  p_recipient_user_id uuid,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (p_recipient_user_id, p_title, p_message, 'money_transfer', p_data);
END;
$$;

-- 3. Data fix: repair existing pending transfers where transfer_to_user_id is profiles.id instead of auth uid
-- Only runs on self-hosted DB where profiles.user_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    EXECUTE '
      UPDATE public.financial_transactions ft
      SET transfer_to_user_id = p.user_id
      FROM public.profiles p
      WHERE ft.transfer_status = ''pending''
        AND ft.transfer_to_user_id IS NOT NULL
        AND ft.transfer_to_user_id = p.id
        AND p.user_id IS NOT NULL
        AND p.user_id != p.id
    ';
  END IF;
END;
$$;
