-- Ensure created_by is always set correctly and timestamps maintained for chat_rooms
CREATE OR REPLACE FUNCTION public.set_created_by_on_chat_rooms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS trg_set_created_by_on_chat_rooms ON public.chat_rooms;
CREATE TRIGGER trg_set_created_by_on_chat_rooms
BEFORE INSERT ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by_on_chat_rooms();