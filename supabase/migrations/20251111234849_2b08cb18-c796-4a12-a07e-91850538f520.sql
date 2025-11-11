-- Remove old warehouse cron job with hardcoded JWT
SELECT cron.unschedule('warehouse-daily-notifications');

-- Recreate warehouse cron job with secret header verification
-- Note: This requires CRON_SECRET to be set as a Postgres config setting
-- Run this after deployment: ALTER DATABASE postgres SET app.cron_secret = 'your-secret-here';

SELECT cron.schedule(
  'warehouse-daily-notifications',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wpxhmajdeunabximyfln.supabase.co/functions/v1/warehouse-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);