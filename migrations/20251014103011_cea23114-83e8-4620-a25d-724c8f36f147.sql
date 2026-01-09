-- Add employment_status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN employment_status text NOT NULL DEFAULT 'active' 
CHECK (employment_status IN ('active', 'terminated'));

-- Add termination details
ALTER TABLE public.profiles
ADD COLUMN termination_date date,
ADD COLUMN termination_reason text;

-- Update RLS policies to block access for terminated employees
-- Drop existing policies that allow user access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with employment_status check
CREATE POLICY "Active users can view own profile"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id AND employment_status = 'active'
);

CREATE POLICY "Active users can update own profile"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id AND employment_status = 'active'
)
WITH CHECK (
  auth.uid() = id AND employment_status = 'active'
);

-- Admin can still view all profiles
-- (existing "Admins can view all profiles" policy remains)

-- Update financial_transactions policies to block terminated users
DROP POLICY IF EXISTS "Authenticated users can create their own transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can insert transactions (trigger sets owner)" ON public.financial_transactions;

CREATE POLICY "Active users can create transactions"
ON public.financial_transactions FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

-- Update other tables to block terminated users from modifications
-- Events
DROP POLICY IF EXISTS "All authenticated users can create events" ON public.events;

CREATE POLICY "Active users can create events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

-- Update vacations policies
DROP POLICY IF EXISTS "Сотрудники могут создавать свои о" ON public.vacations;

CREATE POLICY "Active employees can create vacations"
ON public.vacations FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

-- Function to terminate employee (keeps all records but blocks access)
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
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can terminate employees';
  END IF;

  -- Cannot terminate yourself
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

-- Function to reactivate employee
CREATE OR REPLACE FUNCTION public.reactivate_employee(employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can reactivate employees
  IF get_current_user_role() != 'admin' THEN
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

-- Function to permanently delete employee (admin only)
CREATE OR REPLACE FUNCTION public.delete_employee_permanently(employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can delete employees
  IF get_current_user_role() != 'admin' THEN
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

COMMENT ON COLUMN profiles.employment_status IS 'Employment status: active or terminated';
COMMENT ON COLUMN profiles.termination_date IS 'Date when employee was terminated';
COMMENT ON COLUMN profiles.termination_reason IS 'Reason for termination';
COMMENT ON FUNCTION terminate_employee IS 'Terminate employee access while keeping all records';
COMMENT ON FUNCTION reactivate_employee IS 'Reactivate terminated employee';
COMMENT ON FUNCTION delete_employee_permanently IS 'Permanently delete employee and all related data';
