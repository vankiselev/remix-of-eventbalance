-- Create table for storing system secrets
-- These secrets will be used by Edge Functions instead of environment variables

CREATE TABLE IF NOT EXISTS public.system_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS - only service_role can access directly
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

-- No policies for regular users - access only through security definer function

-- Create function to get secret value (called from Edge Functions)
CREATE OR REPLACE FUNCTION public.get_system_secret(secret_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT value INTO secret_value
  FROM public.system_secrets
  WHERE key = secret_key;
  
  RETURN secret_value;
END;
$$;

-- Revoke access from public and grant only to service_role
REVOKE ALL ON FUNCTION public.get_system_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_secret(TEXT) TO service_role;

-- Insert placeholder secrets (REPLACE VALUES WITH YOUR ACTUAL KEYS!)
INSERT INTO public.system_secrets (key, value, description) VALUES
  ('RESEND_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ для отправки email через Resend'),
  ('SITE_URL', 'https://eventbalance.ru', 'URL сайта для ссылок в письмах'),
  ('GOOGLE_AI_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ Google AI для транзакций'),
  ('CRON_SECRET', 'REPLACE_WITH_YOUR_SECRET', 'Секрет для защиты cron-функций'),
  ('GOOGLE_SHEETS_API_KEY', 'REPLACE_WITH_YOUR_KEY', 'API ключ Google Sheets'),
  ('VAPID_PUBLIC_KEY', 'REPLACE_WITH_YOUR_KEY', 'VAPID публичный ключ для push'),
  ('VAPID_PRIVATE_KEY', 'REPLACE_WITH_YOUR_KEY', 'VAPID приватный ключ для push'),
  ('WEB_PUSH_CONTACT', 'mailto:admin@eventbalance.ru', 'Контакт для Web Push')
ON CONFLICT (key) DO NOTHING;

-- Add comment to the table
COMMENT ON TABLE public.system_secrets IS 'System configuration secrets for Edge Functions. Access via get_system_secret() function only.';
