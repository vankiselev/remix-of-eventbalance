-- Добавление роли admin для a@ab.com через RBAC систему (user_role_assignments)
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
SELECT 
  u.id,
  rd.id,
  u.id
FROM auth.users u
CROSS JOIN public.role_definitions rd
WHERE u.email = 'a@ab.com'
  AND rd.code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
