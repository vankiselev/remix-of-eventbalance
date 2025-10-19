-- Fix chat_rooms INSERT policy to be less restrictive
DROP POLICY IF EXISTS "Active employees can create chat rooms" ON chat_rooms;

CREATE POLICY "Users can create chat rooms"
ON chat_rooms
FOR INSERT
WITH CHECK (auth.uid() = created_by);