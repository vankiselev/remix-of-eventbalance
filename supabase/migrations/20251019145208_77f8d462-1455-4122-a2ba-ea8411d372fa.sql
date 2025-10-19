-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their chats" ON chat_participants;
DROP POLICY IF EXISTS "Chat creators and admins can add participants" ON chat_participants;
DROP POLICY IF EXISTS "Active users can create chat rooms" ON chat_rooms;

-- Create security definer function to check if user is participant of a chat
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _chat_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id
      AND chat_room_id = _chat_room_id
  );
$$;

-- Create security definer function to check if user is chat admin
CREATE OR REPLACE FUNCTION public.is_chat_admin(_user_id uuid, _chat_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id
      AND chat_room_id = _chat_room_id
      AND is_admin = true
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view participants in their chats"
ON chat_participants
FOR SELECT
USING (public.is_chat_participant(auth.uid(), chat_room_id));

CREATE POLICY "Chat participants can add other participants"
ON chat_participants
FOR INSERT
WITH CHECK (
  public.is_chat_participant(auth.uid(), chat_room_id) OR
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = chat_room_id AND created_by = auth.uid()
  )
);

-- Allow all active employees to create chat rooms
CREATE POLICY "Active employees can create chat rooms"
ON chat_rooms
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND employment_status = 'active'
  )
);

-- Update chat rooms SELECT policy to use security definer function
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chat_rooms;

CREATE POLICY "Users can view chats they participate in"
ON chat_rooms
FOR SELECT
USING (public.is_chat_participant(auth.uid(), id));