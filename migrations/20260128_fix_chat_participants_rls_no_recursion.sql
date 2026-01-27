-- Fix infinite recursion in RLS policies for public.chat_participants
-- Some Storage operations indirectly evaluate chat_participants policies; if those policies
-- self-query chat_participants, Postgres raises: "infinite recursion detected in policy".
--
-- This migration force-resets chat_participants policies to non-recursive versions
-- using SECURITY DEFINER helpers.

-- 1) Helpers (SECURITY DEFINER bypasses RLS when checking participation/admin)
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

-- 2) Force drop ALL existing policies on chat_participants (to avoid conflicting/old recursive ones)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_participants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', pol.policyname);
  END LOOP;
END $$;

-- 3) Recreate safe policies (no direct self-SELECTs inside policy expressions)
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- View participants only if you're a participant of the same room
CREATE POLICY "chat_participants_select_in_my_chats"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (public.is_chat_participant(auth.uid(), chat_room_id));

-- Add participants if you're already a participant OR you're the room creator
-- (uses security definer for the participant check to avoid recursion)
CREATE POLICY "chat_participants_insert_by_member_or_creator"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_chat_participant(auth.uid(), chat_room_id)
  OR EXISTS (
    SELECT 1
    FROM public.chat_rooms
    WHERE id = chat_room_id
      AND created_by = auth.uid()
  )
);

-- Leave chat (delete your own participant row)
CREATE POLICY "chat_participants_delete_self"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Update your own last_read_at
CREATE POLICY "chat_participants_update_self_last_read"
ON public.chat_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
