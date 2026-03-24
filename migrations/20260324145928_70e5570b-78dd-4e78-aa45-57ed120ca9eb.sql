
-- Bulk insert invitations for 15 employees
-- Tokens are generated as UUIDs, token_hash computed via md5
-- After migration runs on self-hosted, admin can resend emails from UI

DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_id uuid;
BEGIN
  -- Find the main tenant
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found';
  END IF;

  -- Find an admin user for invited_by
  SELECT ura.user_id INTO v_admin_id
  FROM public.user_role_assignments ura
  JOIN public.role_definitions rd ON rd.id = ura.role_id
  WHERE rd.is_admin_role = true
  LIMIT 1;

  -- Insert invitations (skip if email already has active invitation or existing profile)
  INSERT INTO public.invitations (email, role, status, token, token_hash, tenant_id, invited_by, expires_at)
  SELECT 
    v.email,
    v.role,
    'sent',
    v.token,
    md5(v.token::text),
    v_tenant_id,
    v_admin_id,
    now() + interval '30 days'
  FROM (VALUES
    ('nastya.beloucova@gmail.com',       'employee',  gen_random_uuid()::text),
    ('kolokolnikovaud@gmail.com',        'employee',  gen_random_uuid()::text),
    ('gssavushkina2022@gmail.com',       'employee',  gen_random_uuid()::text),
    ('valerijapasternak23@gmail.com',    'employee',  gen_random_uuid()::text),
    ('Nikitagabov@yandex.ru',            'employee',  gen_random_uuid()::text),
    ('ilona.khudieva@gmail.com',         'employee',  gen_random_uuid()::text),
    ('safonov.ni1999@gmail.com',         'employee',  gen_random_uuid()::text),
    ('kolozubchikshmakajop@gmail.com',   'employee',  gen_random_uuid()::text),
    ('kazanzh21@gmail.com',              'employee',  gen_random_uuid()::text),
    ('egorprimazchikov2015@mail.ru',     'employee',  gen_random_uuid()::text),
    ('rundzya@gmail.com',                'employee',  gen_random_uuid()::text),
    ('buh.funtasy@yandex.ru',            'financier', gen_random_uuid()::text),
    ('andreyzuz19@gmail.com',            'employee',  gen_random_uuid()::text),
    ('Ryzhovavika08@gmail.com',          'employee',  gen_random_uuid()::text),
    ('dkekov@gmail.com',                 'employee',  gen_random_uuid()::text)
  ) AS v(email, role, token)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invitations i 
    WHERE lower(i.email) = lower(v.email) 
    AND i.status IN ('sent', 'pending', 'accepted')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE lower(p.email) = lower(v.email)
  );

  RAISE NOTICE 'Invitations inserted for tenant %', v_tenant_id;
END;
$$;
