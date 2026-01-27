-- Enable Realtime for tasks table
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
