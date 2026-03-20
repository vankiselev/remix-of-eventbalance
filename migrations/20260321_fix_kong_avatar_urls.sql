-- Fix avatar URLs that contain internal Docker host (kong:8000)
-- Replace with the public self-hosted Supabase URL
UPDATE public.profiles
SET avatar_url = regexp_replace(
  avatar_url,
  'http://kong:\d+',
  'https://superbag.eventbalance.ru/a73e88c7ef6a2ca735abc52404257a9f'
)
WHERE avatar_url LIKE '%kong:%';
