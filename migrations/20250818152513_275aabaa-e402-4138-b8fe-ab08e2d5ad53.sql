-- First, make sure we have the admin user in profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  'ikiselev@me.com' as email,
  'Administrator' as full_name,
  'admin' as role
FROM auth.users 
WHERE email = 'ikiselev@me.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin';

-- Add cash_on_hand columns to profiles table to track individual cash amounts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cash_nastya NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_lera NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_vanya NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cash_on_hand NUMERIC DEFAULT 0;

-- Add audit log table for tracking financial transaction changes
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_description TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy for audit log - only admins can view
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.financial_audit_log;
CREATE POLICY "Admins can view all audit logs" 
ON public.financial_audit_log 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Add more detailed fields to financial_transactions table
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS cash_type TEXT, -- 'nastya', 'lera', 'vanya'
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add function to calculate total cash on hand for a user
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(user_uuid UUID)
RETURNS TABLE(
  total_cash NUMERIC,
  cash_nastya NUMERIC,
  cash_lera NUMERIC,
  cash_vanya NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN income_amount > 0 THEN income_amount
        WHEN expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as total_cash,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'nastya' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'nastya' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_nastya,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'lera' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'lera' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_lera,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'vanya' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'vanya' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_vanya
    
  FROM public.financial_transactions
  WHERE created_by = user_uuid;
$$;

-- Function to get company-wide cash summary (admin only)
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
RETURNS TABLE(
  total_cash NUMERIC,
  cash_nastya NUMERIC,
  cash_lera NUMERIC,
  cash_vanya NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN income_amount > 0 THEN income_amount
        WHEN expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as total_cash,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'nastya' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'nastya' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_nastya,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'lera' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'lera' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_lera,
    
    COALESCE(SUM(
      CASE 
        WHEN cash_type = 'vanya' AND income_amount > 0 THEN income_amount
        WHEN cash_type = 'vanya' AND expense_amount > 0 THEN -expense_amount
        ELSE 0
      END
    ), 0) as cash_vanya
    
  FROM public.financial_transactions;
$$;