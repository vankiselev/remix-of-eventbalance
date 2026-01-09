-- Update push_subscriptions table to support new structure

-- Add new columns
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS device_token text,
ADD COLUMN IF NOT EXISTS subscription_data jsonb;

-- Migrate existing data
UPDATE push_subscriptions 
SET platform = device_type,
    subscription_data = jsonb_build_object(
      'endpoint', endpoint,
      'keys', jsonb_build_object(
        'p256dh', p256dh,
        'auth', auth
      )
    )
WHERE platform IS NULL;

-- Make platform NOT NULL after migration
ALTER TABLE push_subscriptions
ALTER COLUMN platform SET NOT NULL;

-- Drop old unique constraint and create new one
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint ON push_subscriptions(user_id, endpoint);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS push_subscriptions_platform_idx ON push_subscriptions(platform);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_platform_idx ON push_subscriptions(user_id, platform);

COMMENT ON COLUMN push_subscriptions.platform IS 'Platform type: web, ios, android';
COMMENT ON COLUMN push_subscriptions.device_token IS 'Native device token for iOS/Android';
COMMENT ON COLUMN push_subscriptions.subscription_data IS 'Full subscription data as JSON';
