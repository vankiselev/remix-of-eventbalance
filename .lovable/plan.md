

## Problem

When an invited employee completes registration, no notification is sent to admins. The root cause: the edge function `register-invited-user` looks for admins in `role_definitions` + `user_role_assignments` tables, but these tables are empty. So it finds zero admins and creates zero notifications.

## Solution

Change the admin-finding logic in the edge function to use two reliable sources:

1. **`invited_by`** field from the `invitations` table — always notify the person who sent the invitation
2. **`tenant_memberships`** where `role` is `'owner'` or `'admin'` for the relevant tenant — notify all tenant admins/owners

Also populate `role_definitions` and `user_role_assignments` with at least one admin role + assignment so the RBAC system works properly across the app.

## Changes

### 1. Database migration: seed role_definitions and assign admin role

Create `role_definitions` entries for "admin" and "member", then assign the current admin user(s) the admin role based on `tenant_memberships` where `role = 'owner'`.

```sql
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
```

### 2. Update edge function: `register-invited-user/index.ts`

Replace the admin notification logic (lines 99-131) to:
- Get the `invited_by` user ID from the invitation record (already queried earlier)
- Query `tenant_memberships` for users with `role` in `('owner', 'admin')` for the relevant `tenant_id`
- Combine both sets of user IDs (deduplicated)
- Send notification to all of them with a message like "Пользователь X зарегистрировался и ожидает одобрения"

The notification message will be updated to indicate the user is waiting for approval: `"зарегистрировался по приглашению и ожидает одобрения"`.

### 3. Redeploy the edge function

Deploy the updated `register-invited-user` function.

