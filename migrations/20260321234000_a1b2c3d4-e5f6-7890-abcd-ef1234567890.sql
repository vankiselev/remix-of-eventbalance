-- 1. Create SECURITY DEFINER function for money transfer notifications
-- This bypasses RLS so any user can create a notification for another user
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

-- 2. Ensure the permissive INSERT policy exists for notifications
-- (the previous migration with non-standard filename may not have been applied)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Authenticated can insert notifications'
  ) THEN
    CREATE POLICY "Authenticated can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;
