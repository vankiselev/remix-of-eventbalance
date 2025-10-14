-- Fix foreign key constraint to allow cascade delete for invitation_audit_log
-- Drop existing constraint if it exists
ALTER TABLE invitation_audit_log 
DROP CONSTRAINT IF EXISTS invitation_audit_log_user_id_fkey;

-- Add foreign key with CASCADE delete
ALTER TABLE invitation_audit_log
ADD CONSTRAINT invitation_audit_log_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also fix invitation_audit_log.invitation_id foreign key if needed
ALTER TABLE invitation_audit_log
DROP CONSTRAINT IF EXISTS invitation_audit_log_invitation_id_fkey;

ALTER TABLE invitation_audit_log
ADD CONSTRAINT invitation_audit_log_invitation_id_fkey
FOREIGN KEY (invitation_id)
REFERENCES invitations(id)
ON DELETE CASCADE;