BEGIN;

-- Add recursion guard to balance recalculation trigger
CREATE OR REPLACE FUNCTION public.trigger_recalculate_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent infinite recursion if this trigger is fired by our own updates
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL; -- skip nested invocations
  END IF;

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
  
  RETURN NULL; -- AFTER trigger result ignored
END;
$$;

COMMIT;