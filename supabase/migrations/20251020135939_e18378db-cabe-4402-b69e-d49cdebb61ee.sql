-- Update reject_money_transfer function to send notification to sender
CREATE OR REPLACE FUNCTION public.reject_money_transfer(p_transaction_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx RECORD;
  recipient_name text;
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

  -- Get recipient's full name for notification
  SELECT full_name INTO recipient_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Update transaction status to rejected
  UPDATE public.financial_transactions
  SET transfer_status = 'rejected',
      updated_at = now()
  WHERE id = p_transaction_id;

  -- Send notification to the sender
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    tx.created_by,
    'Передача денег отклонена',
    COALESCE(recipient_name, 'Получатель') || ' отклонил(а) вашу передачу ' || tx.expense_amount || ' ₽',
    'money_transfer_rejected',
    jsonb_build_object(
      'transaction_id', tx.id,
      'amount', tx.expense_amount,
      'cash_type', tx.cash_type,
      'recipient_name', recipient_name
    )
  );

  RETURN true;
END;
$function$;