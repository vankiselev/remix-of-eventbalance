-- Ensure required columns exist (for self-hosted compatibility)
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS is_admin_role boolean DEFAULT false;

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
