-- Добавление роли admin для a@ab.com через RBAC систему (user_role_assignments)
-- В текущей схеме user_role_assignments есть UNIQUE(user_id), поэтому конфликтуем по user_id.
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
SELECT
  u.id,
  rd.id,
  u.id
FROM auth.users u
JOIN public.role_definitions rd ON rd.code = 'admin'
WHERE u.email = 'a@ab.com'
ON CONFLICT (user_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  assigned_by = EXCLUDED.assigned_by,
  assigned_at = now();
