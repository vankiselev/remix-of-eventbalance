-- Remove any existing duplicates first (keep the newest)
DELETE FROM push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, endpoint) id
  FROM push_subscriptions
  ORDER BY user_id, endpoint, created_at DESC
);

-- Add unique constraint
ALTER TABLE push_subscriptions
ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);