-- Удаление тестовых пользователей
-- a@a.com, admin@test.com, manager@test.com, aa@aa.cc, ab@a.cc

-- Сначала удаляем связанные данные из public схемы
DELETE FROM public.user_role_assignments WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

DELETE FROM public.employees WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

DELETE FROM public.tenant_memberships WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

-- Удаляем identities
SET ROLE supabase_auth_admin;
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc')
);

-- Удаляем самих пользователей
DELETE FROM auth.users WHERE email IN ('a@a.com', 'admin@test.com', 'manager@test.com', 'aa@aa.cc', 'ab@a.cc');
RESET ROLE;
