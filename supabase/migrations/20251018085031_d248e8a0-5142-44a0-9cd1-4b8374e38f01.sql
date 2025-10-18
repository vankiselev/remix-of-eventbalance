-- Fix accept_money_transfer function to properly set project, description and cash_type
CREATE OR REPLACE FUNCTION public.accept_money_transfer(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
  sender_name text;
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

  -- Get sender's full name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = tx.created_by;

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
    static_project_name,
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
    'Получено от ' || COALESCE(sender_name, 'сотрудника'),
    tx.cash_type,
    'Передача денег',
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