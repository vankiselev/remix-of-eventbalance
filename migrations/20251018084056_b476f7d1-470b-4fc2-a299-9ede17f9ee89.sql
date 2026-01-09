-- Accept money transfer: creates mirrored income tx and updates original
CREATE OR REPLACE FUNCTION public.accept_money_transfer(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  income_tx_id uuid;
BEGIN
  -- Load original transaction
  SELECT * INTO tx
  FROM public.financial_transactions
  WHERE id = p_transaction_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Only recipient can accept and only when pending
  IF tx.transfer_to_user_id IS NULL OR tx.transfer_to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: not the recipient';
  END IF;

  IF tx.transfer_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Transfer already processed';
  END IF;

  -- Create income transaction for recipient
  INSERT INTO public.financial_transactions (
    created_by,
    operation_date,
    income_amount,
    expense_amount,
    category,
    cash_type,
    description,
    project_owner,
    transfer_from_user_id,
    linked_transaction_id,
    no_receipt,
    no_receipt_reason
  ) VALUES (
    auth.uid(),
    CURRENT_DATE,
    tx.expense_amount,
    0,
    'Передано или получено от сотрудника',
    tx.cash_type,
    COALESCE('Получено от сотрудника', 'Получено'),
    COALESCE(tx.project_owner, 'Не указан'),
    tx.created_by,
    tx.id,
    true,
    'Внутренняя передача денег между сотрудниками'
  ) RETURNING id INTO income_tx_id;

  -- Update original transaction status and link
  UPDATE public.financial_transactions
  SET transfer_status = 'accepted',
      linked_transaction_id = income_tx_id,
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN true;
END;
$$;

-- Reject money transfer: only recipient can mark as rejected
CREATE OR REPLACE FUNCTION public.reject_money_transfer(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  -- Load original transaction
  SELECT * INTO tx
  FROM public.financial_transactions
  WHERE id = p_transaction_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Only recipient can reject and only when pending
  IF tx.transfer_to_user_id IS NULL OR tx.transfer_to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: not the recipient';
  END IF;

  IF tx.transfer_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Transfer already processed';
  END IF;

  UPDATE public.financial_transactions
  SET transfer_status = 'rejected',
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN true;
END;
$$;