-- Add temp_password column to profiles for test users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password text;

-- Add comment
COMMENT ON COLUMN public.profiles.temp_password IS 'Temporary password for test users, stored for display purposes';