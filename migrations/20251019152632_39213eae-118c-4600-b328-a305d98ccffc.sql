-- Allow creators to read their newly created chat_rooms so INSERT ... RETURNING works
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chat_rooms;

CREATE POLICY "Users can view chats they participate in or created"
ON chat_rooms
FOR SELECT
USING (
  public.is_chat_participant(auth.uid(), id) OR created_by = auth.uid()
);
