-- Add flag for test users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_test_user boolean DEFAULT false;

-- Function to delete all transactions
CREATE OR REPLACE FUNCTION public.delete_all_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin can delete
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete transactions';
  END IF;
  
  -- Delete in correct order due to foreign keys
  DELETE FROM financial_attachments;
  DELETE FROM financial_audit_log;
  DELETE FROM transaction_verifications;
  DELETE FROM financial_report_items WHERE matched_transaction_ids IS NOT NULL;
  DELETE FROM financial_transactions;
END;
$$;

-- Function to delete transactions for specific user
CREATE OR REPLACE FUNCTION public.delete_user_transactions(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete transactions';
  END IF;
  
  -- Delete related records first
  DELETE FROM financial_attachments 
  WHERE transaction_id IN (SELECT id FROM financial_transactions WHERE created_by = target_user_id);
  
  DELETE FROM financial_audit_log 
  WHERE transaction_id IN (SELECT id FROM financial_transactions WHERE created_by = target_user_id);
  
  DELETE FROM transaction_verifications 
  WHERE transaction_id IN (SELECT id FROM financial_transactions WHERE created_by = target_user_id);
  
  -- Delete transactions
  DELETE FROM financial_transactions WHERE created_by = target_user_id;
END;
$$;