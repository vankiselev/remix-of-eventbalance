-- Add mobile navigation settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_nav_settings jsonb DEFAULT '[
  {"path": "/dashboard", "label": "Главная", "icon": "BarChart3", "enabled": true},
  {"path": "/finances", "label": "Финансы", "icon": "DollarSign", "enabled": true},
  {"path": "/transaction", "label": "Трата/Приход", "icon": "Plus", "enabled": true},
  {"path": "/events", "label": "Мероприятия", "icon": "CalendarDays", "enabled": true}
]'::jsonb;

COMMENT ON COLUMN public.profiles.mobile_nav_settings IS 'Custom mobile navigation bar settings for each user';