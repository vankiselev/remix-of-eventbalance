-- Add SECURITY DEFINER RPC for profile upsert during invite registration
-- This bypasses RLS safely, same pattern as ensure_invited_user_membership

CREATE OR REPLACE FUNCTION public.upsert_invited_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_middle_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, middle_name, phone, birth_date, avatar_url)
  VALUES (
    p_user_id,
    p_email,
    COALESCE(p_full_name, p_email),
    p_first_name,
    p_last_name,
    p_middle_name,
    p_phone,
    p_birth_date,
    p_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    middle_name = COALESCE(NULLIF(EXCLUDED.middle_name, ''), profiles.middle_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;
