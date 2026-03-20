

## Fix: Infinite Recursion in `tenant_memberships` RLS Policies

### Problem

The migration `20260128140002_create_tenant_memberships.sql` created policies that query `tenant_memberships` inside their own USING clauses:
- "Users can view memberships in their tenants" — subquery on `tenant_memberships`
- "Tenant owners can manage memberships" — subquery on `tenant_memberships`

This causes PostgreSQL to enter infinite recursion when evaluating any query on the table.

### Solution

1. **Create two `SECURITY DEFINER` functions** that bypass RLS:
   - `is_tenant_member(p_user_id uuid, p_tenant_id uuid)` — checks if user belongs to a tenant
   - `is_tenant_owner(p_user_id uuid, p_tenant_id uuid)` — checks if user is owner of a tenant

2. **Drop and recreate the problematic policies** to use these functions instead of subqueries

### Migration SQL (single file)

```sql
-- Create helper functions (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_tenant_member(...)
CREATE OR REPLACE FUNCTION public.is_tenant_owner(...)

-- Drop recursive policies
DROP POLICY "Users can view memberships in their tenants" ...
DROP POLICY "Tenant owners can manage memberships" ...

-- Recreate using functions
CREATE POLICY ... USING (public.is_tenant_member(auth.uid(), tenant_id))
CREATE POLICY ... USING (public.is_tenant_owner(auth.uid(), tenant_id))
```

Also fix the "Tenant owners can update their tenant" policy on `tenants` table which has the same self-referencing issue.

### Files

| File | Action |
|---|---|
| Migration SQL | Create — fix recursive RLS policies |

No code changes needed — only database migration.

