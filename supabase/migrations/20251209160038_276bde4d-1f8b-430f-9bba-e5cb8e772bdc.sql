-- Enable REPLICA IDENTITY FULL for proper realtime with RLS
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;