-- Удаляем лишнюю колонку user_id из profiles (она дублирует id)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;