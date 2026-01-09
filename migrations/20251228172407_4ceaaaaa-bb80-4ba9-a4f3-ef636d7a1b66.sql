-- Create a table to track password reset rate limits
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_rate_limits_email_time 
  ON public.password_reset_rate_limits (email, attempted_at DESC);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_rate_limits_attempted_at 
  ON public.password_reset_rate_limits (attempted_at);

-- Enable RLS (no policies needed - only accessed via service role in edge function)
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create a function to check and record rate limit
-- Returns true if the request is allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_max_attempts INT DEFAULT 3,
  p_window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_attempts INT;
BEGIN
  -- Count recent attempts for this email
  SELECT COUNT(*) INTO recent_attempts
  FROM password_reset_rate_limits
  WHERE email = lower(p_email)
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval;

  -- If too many attempts, return false (rate limited)
  IF recent_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;

  -- Record this attempt
  INSERT INTO password_reset_rate_limits (email, ip_address)
  VALUES (lower(p_email), p_ip_address);

  RETURN TRUE;
END;
$$;

-- Create a function to clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_password_reset_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM password_reset_rate_limits
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;