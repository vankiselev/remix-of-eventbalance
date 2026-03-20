

## Problem

Transaction creation fails with "Тенант не определён" because `currentTenant` is always `null`. Root cause chain:

1. `TenantContext` calls RPC `get_user_tenant_memberships` which **doesn't exist** in the database
2. The call fails, memberships array stays empty, `currentTenant` remains `null`
3. The `tenants` table is empty — no default tenant was created
4. The `tenant_memberships` table has no records
5. The actual DB schema is simpler than what the migrations defined (missing columns like `is_owner`, `plan`, `settings`, etc.)

## Solution

### 1. Create the RPC function + seed default tenant (SQL migration)

- Create `get_user_tenant_memberships()` RPC that returns tenant memberships with tenant data joined
- Insert a default tenant into `tenants` table
- Insert memberships for all existing users (from `profiles`) into `tenant_memberships`
- Adapt to the actual DB schema (which has simpler columns: `id, tenant_id, user_id, role, created_at` for memberships and `id, name, slug, created_at, updated_at` for tenants)

### 2. Update TenantContext to work with actual schema

- Update `TenantContext.tsx` to handle the simpler tenant/membership structure (no `is_owner`, `status`, `settings` etc.)
- Set sensible defaults for missing fields so the rest of the app doesn't break
- Add a direct query fallback: if RPC fails, query `tenant_memberships` + `tenants` tables directly

### 3. Hide AI suggestions after applying

- In `useTransactionSuggestions.ts`, also set `isDismissed = true` inside `applySuggestions` so the card disappears immediately after click

### Files to edit
- **New migration**: Create RPC function + seed data
- `src/contexts/TenantContext.tsx`: Adapt to actual DB schema, add direct-query fallback
- `src/hooks/useTransactionSuggestions.ts`: Fix dismiss on apply

