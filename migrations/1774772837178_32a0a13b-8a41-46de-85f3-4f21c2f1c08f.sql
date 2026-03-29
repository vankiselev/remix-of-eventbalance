-- Add unique constraint on (user_id, endpoint) for push_subscriptions
-- to enable proper upsert and prevent duplicate subscriptions.
-- Idempotent: drops duplicates first, then creates constraint if not exists.

DO $$
BEGIN
  -- Remove duplicates keeping the latest record per (user_id, endpoint)
  DELETE FROM public.push_subscriptions
  WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, endpoint) id
    FROM public.push_subscriptions
    ORDER BY user_id, endpoint, created_at DESC
  );

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_id_endpoint_key'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);
  END IF;
END $$;
