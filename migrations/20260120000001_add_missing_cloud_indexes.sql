-- Add missing indexes that exist in cloud Supabase but were missing from self-hosted
-- These indexes improve query performance for common access patterns

-- Composite index for filtering active events by date and status
CREATE INDEX IF NOT EXISTS idx_events_start_date_status 
  ON public.events USING btree (start_date, status) 
  WHERE (is_archived = false);

-- Composite index for efficient notification queries by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications USING btree (user_id, read, created_at DESC);

-- Index for filtering profiles by employment status
CREATE INDEX IF NOT EXISTS idx_profiles_employment 
  ON public.profiles USING btree (employment_status, id);
