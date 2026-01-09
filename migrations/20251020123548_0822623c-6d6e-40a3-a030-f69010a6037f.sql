-- Security fix: Add authorization check to get_employee_cash_summary function
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id uuid)
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization check: Only allow user to see their own data OR admin to see anyone's
  IF employee_user_id != auth.uid() AND NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot view other employees financial data';
  END IF;

  RETURN QUERY
  WITH sums AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN cash_type = 'Наличка Настя' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
          ELSE 0
        END
      ), 0) as cash_nastya,
      
      COALESCE(SUM(
        CASE 
          WHEN cash_type = 'Наличка Лера' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
          ELSE 0
        END
      ), 0) as cash_lera,
      
      COALESCE(SUM(
        CASE 
          WHEN cash_type = 'Наличка Ваня' THEN COALESCE(income_amount, 0) - COALESCE(expense_amount, 0)
          ELSE 0
        END
      ), 0) as cash_vanya
      
    FROM public.financial_transactions
    WHERE created_by = employee_user_id
  )
  SELECT 
    (cash_nastya + cash_lera + cash_vanya) AS total_cash,
    cash_nastya,
    cash_lera,
    cash_vanya
  FROM sums;
END;
$$;

-- Security fix: Tighten UPDATE policy on invitations table
-- Drop the overly permissive "System can update invitations" policy
DROP POLICY IF EXISTS "System can update invitations" ON public.invitations;

-- Create more restrictive policy for invitation updates
CREATE POLICY "Functions can update invitation status"
ON public.invitations
FOR UPDATE
USING (
  -- Only allow updates when invitation is in sent status and not expired
  status = 'sent' AND expires_at > now()
)
WITH CHECK (
  -- Only allow updating to accepted or expired status
  status IN ('accepted', 'expired') AND
  -- If status is accepted, accepted_at must be set (A implies B = NOT A OR B)
  (status != 'accepted' OR accepted_at IS NOT NULL)
);

-- Add comment explaining the security model
COMMENT ON TABLE public.invitations IS 'Access controlled via secure functions. Direct SELECT blocked except for admins. Updates restricted to valid status transitions.';

-- Security fix: Add search_path to update_updated_at_column function if missing
-- This function is used in multiple triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;