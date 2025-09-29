-- Create table for event reports
CREATE TABLE public.event_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  preparation_work TEXT NOT NULL,
  onsite_work TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reports" 
ON public.event_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.event_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
ON public.event_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.event_reports 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" 
ON public.event_reports 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_event_reports_updated_at
BEFORE UPDATE ON public.event_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();