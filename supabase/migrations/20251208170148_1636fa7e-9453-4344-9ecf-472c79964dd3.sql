-- Add UPDATE policy for push_subscriptions table
-- This is required for upsert operations to work correctly
CREATE POLICY "Users can update their own subscriptions"
ON push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);