-- Fix linter warning: set immutable function search_path explicitly
CREATE OR REPLACE FUNCTION public.normalize_wallet_key(raw_wallet text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN raw_wallet IS NULL OR btrim(raw_wallet) = '' THEN NULL
    WHEN lower(btrim(raw_wallet)) IN ('cash_nastya', 'настя', 'наличка настя', 'nastya') THEN 'cash_nastya'
    WHEN lower(btrim(raw_wallet)) IN ('cash_lera', 'лера', 'наличка лера', 'lera') THEN 'cash_lera'
    WHEN lower(btrim(raw_wallet)) IN ('cash_vanya', 'ваня', 'наличка ваня', 'vanya') THEN 'cash_vanya'
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