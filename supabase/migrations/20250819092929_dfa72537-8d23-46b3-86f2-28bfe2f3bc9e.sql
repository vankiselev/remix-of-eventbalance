-- Update profiles table to support additional fields for employee management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update employees table to add missing fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create table for tracking profile edit history
CREATE TABLE IF NOT EXISTS public.profile_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profile edit history
ALTER TABLE public.profile_edit_history ENABLE ROW LEVEL SECURITY;

-- Create policies for profile edit history
CREATE POLICY "Admins can view all edit history" ON public.profile_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert edit history" ON public.profile_edit_history
  FOR INSERT WITH CHECK (true);

-- Create function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_edit(
  p_profile_id UUID,
  p_field_name TEXT,
  p_old_value TEXT,
  p_new_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profile_edit_history (
    profile_id,
    edited_by,
    field_name,
    old_value,
    new_value
  ) VALUES (
    p_profile_id,
    auth.uid(),
    p_field_name,
    p_old_value,
    p_new_value
  );
END;
$$;

-- Create function to get employee cash totals (enhanced version)
CREATE OR REPLACE FUNCTION public.get_employee_cash_summary(employee_user_id UUID)
RETURNS TABLE(
  total_cash NUMERIC,
  cash_nastya NUMERIC,
  cash_lera NUMERIC,
  cash_vanya NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
  WHERE created_by = employee_user_id;
$$;