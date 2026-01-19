-- Добавление роли admin для a@ab.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'a@ab.com'
ON CONFLICT (user_id, role) DO NOTHING;
