-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can update profiles with field restrictions" ON public.profiles;

-- Recreate simple update policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (get_current_user_role() = 'admin'::user_role);

-- Create trigger function to prevent unauthorized field updates
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

  -- Regular users can only update basic fields
  IF auth.uid() = NEW.id THEN
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

    RETURN NEW;
  END IF;

  -- If we reach here, user is trying to update someone else's profile
  RAISE EXCEPTION 'Недостаточно прав для редактирования этого профиля';
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS check_profile_update_permissions ON public.profiles;
CREATE TRIGGER check_profile_update_permissions
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_updates();