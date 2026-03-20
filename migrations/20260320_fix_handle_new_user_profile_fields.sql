-- Update handle_new_user to also store phone, birth_date, avatar_url from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_meta jsonb;
  is_invited boolean;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  
  -- Проверяем, был ли пользователь приглашен
  is_invited := raw_meta ? 'invitation_token' OR raw_meta ? 'invited_by';
  
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name,
    last_name,
    middle_name,
    full_name,
    phone,
    birth_date,
    avatar_url,
    role, 
    invitation_status,
    invited_at,
    invited_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(raw_meta ->> 'first_name', ''),
    COALESCE(raw_meta ->> 'last_name', ''),
    COALESCE(raw_meta ->> 'middle_name', ''),
    COALESCE(raw_meta ->> 'full_name', 'User'),
    COALESCE(raw_meta ->> 'phone', NULL),
    CASE WHEN raw_meta ->> 'birth_date' IS NOT NULL AND raw_meta ->> 'birth_date' != '' 
         THEN (raw_meta ->> 'birth_date')::date 
         ELSE NULL END,
    COALESCE(raw_meta ->> 'avatar_url', NULL),
    'employee',
    CASE WHEN is_invited THEN 'invited' ELSE 'pending' END,
    CASE WHEN is_invited THEN now() ELSE NULL END,
    CASE WHEN is_invited THEN (raw_meta ->> 'invited_by')::uuid ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    middle_name = COALESCE(NULLIF(EXCLUDED.middle_name, ''), profiles.middle_name),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, 'User'), profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
