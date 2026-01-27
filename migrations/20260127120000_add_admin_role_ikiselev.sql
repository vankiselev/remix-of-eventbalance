-- Назначение роли admin для ikiselev@me.com через RBAC систему
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
SELECT
  u.id,
  rd.id,
  u.id
FROM auth.users u
JOIN public.role_definitions rd ON rd.code = 'admin'
WHERE u.email = 'ikiselev@me.com'
ON CONFLICT (user_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  assigned_by = EXCLUDED.assigned_by,
  assigned_at = now();
