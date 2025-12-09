-- Fix: Set search_path for the function to prevent path injection
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := 'https://fqlqjvfmhnsbyxaphybf.supabase.co';
  
  -- Call the Edge Function to send push notifications
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-message-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', NEW.id,
        'chat_room_id', NEW.chat_room_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'created_at', NEW.created_at
      )
    )::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send message notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;