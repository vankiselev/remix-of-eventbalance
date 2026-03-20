-- Seed role_definitions with standard roles
INSERT INTO role_definitions (name, display_name, code, is_admin_role)
VALUES 
  ('admin', 'Администратор', 'admin', true),
  ('super_admin', 'Супер-администратор', 'super_admin', true),
  ('member', 'Сотрудник', 'member', false)
ON CONFLICT DO NOTHING;

-- Assign admin role to all tenant owners
INSERT INTO user_role_assignments (user_id, role_id)
SELECT tm.user_id, rd.id
FROM tenant_memberships tm
JOIN role_definitions rd ON rd.name = 'admin'
WHERE tm.role = 'owner'
ON CONFLICT DO NOTHING;
