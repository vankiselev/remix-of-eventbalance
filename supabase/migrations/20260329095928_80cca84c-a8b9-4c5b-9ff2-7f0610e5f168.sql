-- Production fix: restore cash summary RPC and move calculations to stable wallet_key

-- 1) Add stable wallet_key column (idempotent)
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS wallet_key text;

-- 2) Normalizer function for wallet aliases -> stable key
CREATE OR REPLACE FUNCTION public.normalize_wallet_key(raw_wallet text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_wallet IS NULL OR btrim(raw_wallet) = '' THEN NULL

    -- cash wallets
    WHEN lower(btrim(raw_wallet)) IN ('cash_nastya', 'настя', 'наличка настя', 'nastya') THEN 'cash_nastya'
    WHEN lower(btrim(raw_wallet)) IN ('cash_lera', 'лера', 'наличка лера', 'lera') THEN 'cash_lera'
    WHEN lower(btrim(raw_wallet)) IN ('cash_vanya', 'ваня', 'наличка ваня', 'vanya') THEN 'cash_vanya'

    -- non-cash wallets
    WHEN lower(btrim(raw_wallet)) IN ('corp_card_nastya', 'корп. карта настя', 'корп.карта настя') THEN 'corp_card_nastya'
    WHEN lower(btrim(raw_wallet)) IN ('corp_card_lera', 'корп. карта лера', 'корп.карта лера') THEN 'corp_card_lera'
    WHEN lower(btrim(raw_wallet)) IN ('ip_nastya', 'ип настя') THEN 'ip_nastya'
    WHEN lower(btrim(raw_wallet)) IN ('ip_lera', 'ип лера') THEN 'ip_lera'
    WHEN lower(btrim(raw_wallet)) IN ('client_paid', 'оплатил(а) клиент', 'оплатил клиент') THEN 'client_paid'
    WHEN lower(btrim(raw_wallet)) IN ('nastya_paid', 'оплатила настя') THEN 'nastya_paid'
    WHEN lower(btrim(raw_wallet)) IN ('lera_paid', 'оплатила лера') THEN 'lera_paid'
    WHEN lower(btrim(raw_wallet)) IN ('nastya_received', 'получила настя') THEN 'nastya_received'
    WHEN lower(btrim(raw_wallet)) IN ('lera_received', 'получила лера') THEN 'lera_received'

    ELSE NULL
  END
$$;

-- 3) Backfill wallet_key from legacy cash_type / existing wallet_key values
UPDATE public.financial_transactions ft
SET wallet_key = public.normalize_wallet_key(COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type))
WHERE COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type) IS NOT NULL
  AND (
    ft.wallet_key IS NULL
    OR ft.wallet_key = ''
    OR ft.wallet_key <> public.normalize_wallet_key(COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type))
  );

-- 4) Helpful index for tenant+wallet aggregations
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_wallet_key
ON public.financial_transactions(tenant_id, wallet_key);

-- 5) Restore company cash summary RPC (tenant-safe, cash-only totals)
CREATE OR REPLACE FUNCTION public.get_company_cash_summary()
RETURNS TABLE(total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      public.normalize_wallet_key(COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type)) AS wk,
      COALESCE(ft.income_amount, 0)::numeric AS income,
      COALESCE(ft.expense_amount, 0)::numeric AS expense
    FROM public.financial_transactions ft
    WHERE COALESCE(ft.is_draft, false) = false
      AND ft.tenant_id IN (
        SELECT tm.tenant_id
        FROM public.tenant_memberships tm
        WHERE tm.user_id = auth.uid()
      )
  )
  SELECT
    COALESCE(SUM(CASE WHEN wk IN ('cash_nastya', 'cash_lera', 'cash_vanya') THEN income - expense ELSE 0 END), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN wk = 'cash_nastya' THEN income - expense ELSE 0 END), 0) AS cash_nastya,
    COALESCE(SUM(CASE WHEN wk = 'cash_lera' THEN income - expense ELSE 0 END), 0) AS cash_lera,
    COALESCE(SUM(CASE WHEN wk = 'cash_vanya' THEN income - expense ELSE 0 END), 0) AS cash_vanya
  FROM scoped;
$$;

-- 6) Update user totals RPC to return normalized wallet key rows
CREATE OR REPLACE FUNCTION public.calculate_user_cash_totals(p_user_id uuid)
RETURNS TABLE(cash_type text, total_income numeric, total_expense numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.normalize_wallet_key(COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type)) AS cash_type,
    COALESCE(SUM(COALESCE(ft.income_amount, 0)), 0)::numeric AS total_income,
    COALESCE(SUM(COALESCE(ft.expense_amount, 0)), 0)::numeric AS total_expense
  FROM public.financial_transactions ft
  WHERE ft.created_by = p_user_id
    AND COALESCE(ft.is_draft, false) = false
    AND public.normalize_wallet_key(COALESCE(NULLIF(ft.wallet_key, ''), ft.cash_type)) IS NOT NULL
  GROUP BY 1;
$$;