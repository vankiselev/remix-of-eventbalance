-- Test table to verify CI/CD migrations
CREATE TABLE public.test_migrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_migrations ENABLE ROW LEVEL SECURITY;

-- Simple policy for testing
CREATE POLICY "Anyone can view test data" 
ON public.test_migrations 
FOR SELECT 
USING (true);