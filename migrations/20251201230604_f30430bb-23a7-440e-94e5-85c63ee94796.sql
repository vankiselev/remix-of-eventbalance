-- Allow financiers to view basic profile info for transaction review
CREATE POLICY "Financiers can view basic profiles for review"
ON profiles
FOR SELECT
TO authenticated
USING (
  has_permission('transactions.review'::text) OR 
  has_permission('transactions.view_all'::text)
);