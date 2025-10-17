-- Add money transfer fields to financial_transactions table
ALTER TABLE public.financial_transactions
ADD COLUMN transfer_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN transfer_status text CHECK (transfer_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN linked_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
ADD COLUMN transfer_from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_financial_transactions_transfer_to ON public.financial_transactions(transfer_to_user_id);
CREATE INDEX idx_financial_transactions_transfer_from ON public.financial_transactions(transfer_from_user_id);
CREATE INDEX idx_financial_transactions_linked ON public.financial_transactions(linked_transaction_id);

-- Update RLS policies to allow recipients to see pending transfers
CREATE POLICY "Recipients can view pending transfers to them"
ON public.financial_transactions
FOR SELECT
USING (
  auth.uid() = transfer_to_user_id 
  AND transfer_status = 'pending'
);

-- Comment for clarity
COMMENT ON COLUMN public.financial_transactions.transfer_to_user_id IS 'User ID of the recipient when transferring money between employees';
COMMENT ON COLUMN public.financial_transactions.transfer_status IS 'Status of money transfer: pending, accepted, or rejected';
COMMENT ON COLUMN public.financial_transactions.linked_transaction_id IS 'ID of the linked transaction (connects expense and income transactions)';
COMMENT ON COLUMN public.financial_transactions.transfer_from_user_id IS 'User ID of the sender (for income transactions from transfers)';