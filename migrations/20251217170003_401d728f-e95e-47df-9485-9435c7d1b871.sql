-- Create table for storing user dashboard widget configurations
CREATE TABLE IF NOT EXISTS public.user_dashboard_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own layout
CREATE POLICY "Users can view their own dashboard layout"
ON public.user_dashboard_layouts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own layout
CREATE POLICY "Users can create their own dashboard layout"
ON public.user_dashboard_layouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own layout
CREATE POLICY "Users can update their own dashboard layout"
ON public.user_dashboard_layouts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own layout
CREATE POLICY "Users can delete their own dashboard layout"
ON public.user_dashboard_layouts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_dashboard_layouts_updated_at
BEFORE UPDATE ON public.user_dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();