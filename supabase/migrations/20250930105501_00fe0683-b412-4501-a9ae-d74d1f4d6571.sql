-- Function to recalculate balance_after for all transactions of a specific cash_type
CREATE OR REPLACE FUNCTION recalculate_balances_for_cash_type(p_cash_type TEXT)
RETURNS void AS $$
DECLARE
  v_transaction RECORD;
  v_running_balance NUMERIC := 0;
BEGIN
  -- Loop through all transactions for this cash_type in chronological order
  FOR v_transaction IN
    SELECT id, income_amount, expense_amount
    FROM financial_transactions
    WHERE cash_type = p_cash_type
    ORDER BY operation_date ASC, created_at ASC
  LOOP
    -- Calculate new balance
    v_running_balance := v_running_balance + COALESCE(v_transaction.income_amount, 0) - COALESCE(v_transaction.expense_amount, 0);
    
    -- Update the balance_after for this transaction
    UPDATE financial_transactions
    SET balance_after = v_running_balance
    WHERE id = v_transaction.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to recalculate balances after insert/update/delete
CREATE OR REPLACE FUNCTION trigger_recalculate_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine which cash_type to recalculate
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_balances_for_cash_type(OLD.cash_type);
  ELSE
    PERFORM recalculate_balances_for_cash_type(NEW.cash_type);
    
    -- If cash_type changed during update, also recalculate the old cash_type
    IF TG_OP = 'UPDATE' AND OLD.cash_type IS DISTINCT FROM NEW.cash_type THEN
      PERFORM recalculate_balances_for_cash_type(OLD.cash_type);
    END IF;
  END IF;
  
  RETURN NULL; -- Result is ignored for AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS recalculate_balances_trigger ON financial_transactions;

CREATE TRIGGER recalculate_balances_trigger
AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_balances();