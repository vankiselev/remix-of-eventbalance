BEGIN;

-- Function to set created_by and timestamps on financial_transactions
CREATE OR REPLACE FUNCTION public.set_created_by_on_financial_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the creator is the current user
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    IF NEW.created_at IS NULL THEN
      NEW.created_at := now();
    END IF;
  END IF;
  -- Always bump updated_at on insert/update
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Attach trigger (covers both insert and update)
DROP TRIGGER IF EXISTS set_fin_trx_created_by ON public.financial_transactions;
CREATE TRIGGER set_fin_trx_created_by
BEFORE INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by_on_financial_transactions();

COMMIT;