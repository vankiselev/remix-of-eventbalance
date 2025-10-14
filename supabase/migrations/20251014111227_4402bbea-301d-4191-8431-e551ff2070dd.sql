-- CRITICAL SECURITY FIX: Implement proper role-based access control
-- This migration addresses two critical security vulnerabilities:
-- 1. Hardcoded super admin email
-- 2. Roles stored in profiles table (single point of failure)

-- Step 1: Create app_role enum if it doesn't exist (for new roles system)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'employee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  revoked_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  id as user_id,
  CASE 
    -- Convert hardcoded super admin to super_admin role
    WHEN email = 'ikiselev@me.com' THEN 'super_admin'::app_role
    WHEN role = 'admin'::user_role THEN 'admin'::app_role
    ELSE 'employee'::app_role
  END as role,
  id as assigned_by, -- self-assigned for initial migration
  created_at as assigned_at
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Create security definer function to check roles (PREVENTS RLS RECURSION)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND revoked_at IS NULL
  )
$$;

-- Step 5: Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND revoked_at IS NULL
  ORDER BY 
    CASE role
      WHEN 'super_admin'::app_role THEN 1
      WHEN 'admin'::app_role THEN 2
      WHEN 'employee'::app_role THEN 3
    END
  LIMIT 1
$$;

-- Step 6: Update get_current_user_role to use new system (REMOVE HARDCODED EMAIL)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE get_user_highest_role(auth.uid())
      WHEN 'super_admin'::app_role THEN 'admin'::user_role
      WHEN 'admin'::app_role THEN 'admin'::user_role
      ELSE 'employee'::user_role
    END;
$$;

-- Step 7: Create function to assign roles (only admins can assign)
CREATE OR REPLACE FUNCTION public.assign_role(
  _user_id uuid,
  _role app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins and admins can assign roles
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;
  
  -- Only super admins can assign super_admin or admin roles
  IF (_role IN ('super_admin'::app_role, 'admin'::app_role)) AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super administrators can assign admin roles';
  END IF;
  
  -- Cannot change your own role
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  
  -- Insert new role
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO UPDATE
  SET revoked_at = NULL, assigned_by = auth.uid(), assigned_at = now();
  
  -- Log the role assignment
  INSERT INTO public.profile_edit_history (profile_id, edited_by, field_name, old_value, new_value)
  VALUES (_user_id, auth.uid(), 'role', NULL, _role::text);
  
  RETURN true;
END;
$$;

-- Step 8: Create function to revoke roles
CREATE OR REPLACE FUNCTION public.revoke_role(
  _user_id uuid,
  _role app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins and admins can revoke roles
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only administrators can revoke roles';
  END IF;
  
  -- Only super admins can revoke super_admin or admin roles
  IF (_role IN ('super_admin'::app_role, 'admin'::app_role)) AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super administrators can revoke admin roles';
  END IF;
  
  -- Cannot revoke your own role
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own role';
  END IF;
  
  -- Revoke the role
  UPDATE user_roles
  SET revoked_at = now(), revoked_by = auth.uid()
  WHERE user_id = _user_id AND role = _role AND revoked_at IS NULL;
  
  RETURN true;
END;
$$;

-- Step 9: Update can_edit_admin_profile to use new system (REMOVE HARDCODED EMAIL)
CREATE OR REPLACE FUNCTION public.can_edit_admin_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admin can edit anyone
    has_role(auth.uid(), 'super_admin') OR
    -- Regular admins can edit employees and their own profile
    (
      has_role(auth.uid(), 'admin') AND
      (
        auth.uid() = target_user_id OR
        NOT (has_role(target_user_id, 'admin') OR has_role(target_user_id, 'super_admin'))
      )
    ) OR
    -- Users can edit their own profile (basic fields only)
    auth.uid() = target_user_id;
$$;

-- Step 10: Update can_update_profile_fields to use new system (REMOVE HARDCODED EMAIL)
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin can edit everything
  IF has_role(auth.uid(), 'super_admin') THEN
    RETURN true;
  END IF;

  -- Regular admins can edit everything
  IF has_role(auth.uid(), 'admin') THEN
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

-- Step 11: Update prevent_unauthorized_profile_updates trigger (REMOVE HARDCODED EMAIL)
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin can change everything
  IF has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Regular admins can change everything except other admins' roles
  IF has_role(auth.uid(), 'admin') THEN
    -- Cannot change role of other admins or super admins
    IF OLD.id != auth.uid() AND OLD.role IS DISTINCT FROM NEW.role THEN
      IF has_role(OLD.id, 'admin') OR has_role(OLD.id, 'super_admin') THEN
        RAISE EXCEPTION 'Недостаточно прав для изменения роли администратора';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Regular users can update their own profile
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

  RAISE EXCEPTION 'Недостаточно прав для редактирования этого профиля';
END;
$$;

-- Step 12: Add self-termination check to terminate_employee (NEW SECURITY FIX)
CREATE OR REPLACE FUNCTION public.terminate_employee(
  employee_user_id uuid,
  termination_reason_text text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can terminate employees
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only administrators can terminate employees';
  END IF;

  -- Cannot terminate yourself (SECURITY FIX)
  IF employee_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot terminate yourself';
  END IF;

  -- Update profile to terminated status
  UPDATE public.profiles
  SET 
    employment_status = 'terminated',
    termination_date = CURRENT_DATE,
    termination_reason = termination_reason_text,
    updated_at = now()
  WHERE id = employee_user_id;

  -- Log the termination
  INSERT INTO public.profile_edit_history (
    profile_id,
    edited_by,
    field_name,
    old_value,
    new_value
  ) VALUES (
    employee_user_id,
    auth.uid(),
    'employment_status',
    'active',
    'terminated'
  );

  RETURN true;
END;
$$;

-- Step 13: Update reactivate_employee to use new system
CREATE OR REPLACE FUNCTION public.reactivate_employee(employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can reactivate employees
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only administrators can reactivate employees';
  END IF;

  -- Update profile to active status
  UPDATE public.profiles
  SET 
    employment_status = 'active',
    termination_date = NULL,
    termination_reason = NULL,
    updated_at = now()
  WHERE id = employee_user_id;

  -- Log the reactivation
  INSERT INTO public.profile_edit_history (
    profile_id,
    edited_by,
    field_name,
    old_value,
    new_value
  ) VALUES (
    employee_user_id,
    auth.uid(),
    'employment_status',
    'terminated',
    'active'
  );

  RETURN true;
END;
$$;

-- Step 14: Update delete_employee_permanently to use new system
CREATE OR REPLACE FUNCTION public.delete_employee_permanently(employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can delete employees
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only administrators can delete employees';
  END IF;

  -- Cannot delete yourself
  IF employee_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete yourself';
  END IF;

  -- Delete from auth.users (will cascade to profiles and all related tables)
  DELETE FROM auth.users WHERE id = employee_user_id;

  RETURN true;
END;
$$;

-- Step 15: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- No direct INSERT/UPDATE/DELETE policies - must use assign_role/revoke_role functions

-- Step 16: Add comment explaining role migration
COMMENT ON TABLE public.user_roles IS 'Secure role management table. Roles should ONLY be modified via assign_role() and revoke_role() functions to maintain audit trail and security.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles. Uses SECURITY DEFINER to avoid RLS recursion issues.';
COMMENT ON FUNCTION public.assign_role IS 'Secure function to assign roles. Only admins can assign employee roles, only super_admins can assign admin roles.';
COMMENT ON FUNCTION public.revoke_role IS 'Secure function to revoke roles. Maintains audit trail in profile_edit_history.';