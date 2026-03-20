-- Allow authenticated users to insert notifications (needed for admin approval flow)
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);