-- Update trigger function to allow avatar updates
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Super admin can change everything
  IF auth.jwt() ->> 'email' = 'ikiselev@me.com' THEN
    RETURN NEW;
  END IF;

  -- Regular admins can change everything
  IF current_user_role = 'admin'::user_role THEN
    RETURN NEW;
  END IF;

  -- Regular users can update their own profile
  IF auth.uid() = NEW.id THEN
    -- Check if only allowed fields are being changed
    -- Allowed fields: full_name, email, phone, phone_e164, birth_date, avatar_url, updated_at
    
    -- Prevent changes to protected fields
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения роли';
    END IF;

    IF OLD.cash_nastya IS DISTINCT FROM NEW.cash_nastya 
       OR OLD.cash_lera IS DISTINCT FROM NEW.cash_lera 
       OR OLD.cash_vanya IS DISTINCT FROM NEW.cash_vanya 
       OR OLD.total_cash_on_hand IS DISTINCT FROM NEW.total_cash_on_hand THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения финансовых данных';
    END IF;

    IF OLD.google_sheet_id IS DISTINCT FROM NEW.google_sheet_id 
       OR OLD.google_drive_folder_id IS DISTINCT FROM NEW.google_drive_folder_id 
       OR OLD.google_sheet_url IS DISTINCT FROM NEW.google_sheet_url 
       OR OLD.google_drive_folder_url IS DISTINCT FROM NEW.google_drive_folder_url THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения интеграций';
    END IF;

    -- Allow update if only basic fields changed (including avatar_url)
    RETURN NEW;
  END IF;

  -- If we reach here, user is trying to update someone else's profile
  RAISE EXCEPTION 'Недостаточно прав для редактирования этого профиля';
END;
$$;