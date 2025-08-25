-- Add security function to check if user can edit administrator profiles
CREATE OR REPLACE FUNCTION public.can_edit_admin_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admin can edit anyone
    (auth.jwt() ->> 'email' = 'ikiselev@me.com') OR
    -- Regular admins can edit employees and their own profile
    (
      get_current_user_role() = 'admin'::user_role AND
      (
        auth.uid() = target_user_id OR
        (SELECT role FROM public.profiles WHERE id = target_user_id) = 'employee'::user_role
      )
    ) OR
    -- Users can edit their own profile (basic fields only)
    auth.uid() = target_user_id;
$$;

-- Update profiles table policies for administrator editing
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can update profiles with proper permissions"
ON public.profiles
FOR UPDATE
USING (public.can_edit_admin_profile(id));

-- Add policy for employees table to allow admin creation
CREATE POLICY "Allow creating employee records for admins" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  (get_current_user_role() = 'admin'::user_role) OR
  (auth.uid() = user_id)
);

-- Update employees policies to allow administrator records
DROP POLICY IF EXISTS "Admins have full access to employee records including salary" ON public.employees;

CREATE POLICY "Admins can manage all employee records including salary"
ON public.employees
FOR ALL
USING (get_current_user_role() = 'admin'::user_role)
WITH CHECK (get_current_user_role() = 'admin'::user_role);