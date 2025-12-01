-- Create import_jobs table for tracking background imports
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'finances',
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own import jobs
CREATE POLICY "Users can view their own import jobs"
ON public.import_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own import jobs
CREATE POLICY "Users can create their own import jobs"
ON public.import_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can update import jobs (for edge function)
CREATE POLICY "System can update import jobs"
ON public.import_jobs
FOR UPDATE
USING (true);

-- Users can delete their own import jobs
CREATE POLICY "Users can delete their own import jobs"
ON public.import_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);