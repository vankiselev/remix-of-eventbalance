-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update profiles with proper permissions" ON public.profiles;

-- Create function to check if user can update profile fields
CREATE OR REPLACE FUNCTION public.can_update_profile_fields(
  target_user_id uuid,
  old_role user_role,
  new_role user_role,
  old_cash_nastya numeric,
  new_cash_nastya numeric,
  old_cash_lera numeric,
  new_cash_lera numeric,
  old_cash_vanya numeric,
  new_cash_vanya numeric,
  old_total_cash numeric,
  new_total_cash numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin can edit everything
  IF auth.jwt() ->> 'email' = 'ikiselev@me.com' THEN
    RETURN true;
  END IF;

  -- Regular admins can edit everything
  IF get_current_user_role() = 'admin'::user_role THEN
    RETURN true;
  END IF;

  -- Regular users can only edit their own profile and only basic fields
  IF auth.uid() = target_user_id THEN
    -- Check that protected fields haven't changed
    RETURN (
      (old_role IS NOT DISTINCT FROM new_role) AND
      (old_cash_nastya IS NOT DISTINCT FROM new_cash_nastya) AND
      (old_cash_lera IS NOT DISTINCT FROM new_cash_lera) AND
      (old_cash_vanya IS NOT DISTINCT FROM new_cash_vanya) AND
      (old_total_cash IS NOT DISTINCT FROM new_total_cash)
    );
  END IF;

  RETURN false;
END;
$$;

-- Create policy for profile updates with field-level checks
CREATE POLICY "Users can update profiles with field restrictions"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id OR get_current_user_role() = 'admin'::user_role
);