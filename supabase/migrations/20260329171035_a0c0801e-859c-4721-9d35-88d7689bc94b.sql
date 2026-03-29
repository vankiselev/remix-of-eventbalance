INSERT INTO public.system_secrets (key, value) VALUES
  ('VAPID_PUBLIC_KEY', 'BJw8BXk0EM1N2jXCx6FwoBEZmK30J5yhGWCubHAwZ3729047zXvPRj2X6gz93LWjUvgEp51JFPv8-QFvQ9DrBoY'),
  ('VAPID_PRIVATE_KEY', '-Ke65Jw1-gTr6lTwB1f_xNzMx41Zczomx4kpOMkrYog'),
  ('WEB_PUSH_CONTACT', 'mailto:ikiselev@me.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();