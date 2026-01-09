-- Create or replace function to handle message notification trigger
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call edge function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'messages',
        'schema', 'public',
        'record', jsonb_build_object(
          'id', NEW.id::text,
          'chat_room_id', NEW.chat_room_id::text,
          'sender_id', NEW.sender_id::text,
          'content', NEW.content,
          'created_at', NEW.created_at::text
        ),
        'old_record', NULL
      ),
      timeout_milliseconds := 5000
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();