-- Enable Realtime for user_role_assignments table
ALTER TABLE user_role_assignments REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_role_assignments;