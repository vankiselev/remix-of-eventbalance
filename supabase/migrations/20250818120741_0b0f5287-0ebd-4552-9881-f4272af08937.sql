-- Create financial transactions table for the new expense/income form
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Transaction details
  operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID REFERENCES public.events(id),
  project_owner TEXT NOT NULL,
  description TEXT NOT NULL,
  expense_amount NUMERIC DEFAULT 0,
  income_amount NUMERIC DEFAULT 0,
  category TEXT NOT NULL,
  
  -- Financial tracking
  CONSTRAINT valid_amounts CHECK (
    (expense_amount > 0 AND income_amount = 0) OR 
    (income_amount > 0 AND expense_amount = 0)
  )
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view financial transactions" 
ON public.financial_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "All authenticated users can create financial transactions" 
ON public.financial_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own financial transactions" 
ON public.financial_transactions 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all financial transactions" 
ON public.financial_transactions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Add updated_at trigger
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();