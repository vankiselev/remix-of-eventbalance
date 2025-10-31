-- Create table for event action requests (delete/cancel)
CREATE TABLE public.event_action_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('delete', 'cancel')),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_action_requests ENABLE ROW LEVEL SECURITY;

-- Policies for event_action_requests
CREATE POLICY "Users can create their own requests"
  ON public.event_action_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can view their own requests"
  ON public.event_action_requests
  FOR SELECT
  USING (auth.uid() = requested_by OR is_admin_user(auth.uid()));

CREATE POLICY "Admins can update requests"
  ON public.event_action_requests
  FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_event_action_requests_status ON public.event_action_requests(status);
CREATE INDEX idx_event_action_requests_event_id ON public.event_action_requests(event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_event_action_requests_updated_at
  BEFORE UPDATE ON public.event_action_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();