-- Create table for employee salaries per event report
CREATE TABLE public.event_report_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.event_reports(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('Наличка Настя', 'Наличка Лера', 'Наличка Ваня')),
  notes TEXT,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, employee_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.event_report_salaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all event report salaries" 
ON public.event_report_salaries 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Employees can view their own salaries" 
ON public.event_report_salaries 
FOR SELECT 
USING (auth.uid() = employee_user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_event_report_salaries_updated_at
BEFORE UPDATE ON public.event_report_salaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();