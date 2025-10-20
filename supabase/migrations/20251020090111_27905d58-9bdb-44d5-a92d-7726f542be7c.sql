-- Drop the trigger that's causing the "schema net does not exist" error
DROP TRIGGER IF EXISTS on_message_created ON public.messages;

-- Drop the function that uses pg_net
DROP FUNCTION IF EXISTS public.handle_new_message_notification();

-- Note: Message notifications are already handled by realtime subscriptions 
-- in the useMessages hook on the client side, so this trigger is not needed