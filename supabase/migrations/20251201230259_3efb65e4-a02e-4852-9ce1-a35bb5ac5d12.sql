-- Allow admins to delete audit log entries
CREATE POLICY "Admins can delete audit logs" 
ON financial_audit_log 
FOR DELETE 
TO authenticated 
USING (is_admin_user(auth.uid()));