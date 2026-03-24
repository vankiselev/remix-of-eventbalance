-- Bulk insert invitations for 15 users (self-hosted safe, token-type compatible)
-- Idempotent: skips emails that already have active invite or existing profile

DO $$
DECLARE
  v_tenant_id uuid;
  v_token_type text;
BEGIN
  -- Prefer tenant from memberships (works even if tenants table shape differs)
  IF to_regclass('public.tenant_memberships') IS NOT NULL THEN
    SELECT tm.tenant_id
    INTO v_tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.tenant_id IS NOT NULL
    LIMIT 1;
  END IF;

  -- Fallback: first tenant record
  IF v_tenant_id IS NULL AND to_regclass('public.tenants') IS NOT NULL THEN
    SELECT t.id
    INTO v_tenant_id
    FROM public.tenants t
    LIMIT 1;
  END IF;

  -- If tenant still not found, do not fail the whole deploy pipeline
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Skipping bulk invite migration: tenant_id not found';
    RETURN;
  END IF;

  -- Self-hosted compatibility: invitations.token can be uuid or text
  SELECT c.data_type
  INTO v_token_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'invitations'
    AND c.column_name = 'token'
  LIMIT 1;

  IF v_token_type = 'uuid' THEN
    INSERT INTO public.invitations (email, role, status, token, token_hash, tenant_id, expires_at)
    SELECT
      src.email,
      src.role,
      'sent',
      src.token_uuid,
      md5(src.token_uuid::text),
      v_tenant_id,
      now() + interval '30 days'
    FROM (
      SELECT v.email, v.role, gen_random_uuid() AS token_uuid
      FROM (VALUES
        ('nastya.beloucova@gmail.com',       'employee'),
        ('kolokolnikovaud@gmail.com',        'employee'),
        ('gssavushkina2022@gmail.com',       'employee'),
        ('valerijapasternak23@gmail.com',    'employee'),
        ('Nikitagabov@yandex.ru',            'employee'),
        ('ilona.khudieva@gmail.com',         'employee'),
        ('safonov.ni1999@gmail.com',         'employee'),
        ('kolozubchikshmakajop@gmail.com',   'employee'),
        ('kazanzh21@gmail.com',              'employee'),
        ('egorprimazchikov2015@mail.ru',     'employee'),
        ('rundzya@gmail.com',                'employee'),
        ('buh.funtasy@yandex.ru',            'financier'),
        ('andreyzuz19@gmail.com',            'employee'),
        ('Ryzhovavika08@gmail.com',          'employee'),
        ('dkekov@gmail.com',                 'employee')
      ) AS v(email, role)
    ) AS src
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE lower(i.email) = lower(src.email)
        AND i.status IN ('sent', 'pending', 'accepted')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.email) = lower(src.email)
    );
  ELSE
    -- Default branch covers text token type
    INSERT INTO public.invitations (email, role, status, token, token_hash, tenant_id, expires_at)
    SELECT
      src.email,
      src.role,
      'sent',
      src.token_uuid::text,
      md5(src.token_uuid::text),
      v_tenant_id,
      now() + interval '30 days'
    FROM (
      SELECT v.email, v.role, gen_random_uuid() AS token_uuid
      FROM (VALUES
        ('nastya.beloucova@gmail.com',       'employee'),
        ('kolokolnikovaud@gmail.com',        'employee'),
        ('gssavushkina2022@gmail.com',       'employee'),
        ('valerijapasternak23@gmail.com',    'employee'),
        ('Nikitagabov@yandex.ru',            'employee'),
        ('ilona.khudieva@gmail.com',         'employee'),
        ('safonov.ni1999@gmail.com',         'employee'),
        ('kolozubchikshmakajop@gmail.com',   'employee'),
        ('kazanzh21@gmail.com',              'employee'),
        ('egorprimazchikov2015@mail.ru',     'employee'),
        ('rundzya@gmail.com',                'employee'),
        ('buh.funtasy@yandex.ru',            'financier'),
        ('andreyzuz19@gmail.com',            'employee'),
        ('Ryzhovavika08@gmail.com',          'employee'),
        ('dkekov@gmail.com',                 'employee')
      ) AS v(email, role)
    ) AS src
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE lower(i.email) = lower(src.email)
        AND i.status IN ('sent', 'pending', 'accepted')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.email) = lower(src.email)
    );
  END IF;

  RAISE NOTICE 'Bulk invite migration done for tenant %, token_type=%', v_tenant_id, COALESCE(v_token_type, 'unknown');
END;
$$;