

## Problem

The `invitations.role` column uses the database enum type `user_role` which only allows two values: `'admin'` and `'employee'`. When selecting a role like "Финансист" (code: `financier`), the system tries to insert `"financier"` into this enum column, causing the error.

## Solution

Change the `invitations.role` column from `user_role` enum to `text` type. This allows storing any role code from `role_definitions` without enum constraints.

## Steps

1. **Migration**: `ALTER TABLE public.invitations ALTER COLUMN role TYPE text;`
   - This converts the column to plain text, preserving existing values
   - No data loss — existing 'admin'/'employee' values remain valid as text

2. **No frontend changes needed** — the `InviteUserDialog` already sends the correct role code.

## What will work after this
- Creating invitations with any role (Финансист, Бухгалтер, etc.)
- Existing invitations remain intact
- The `approve_pending_user_membership` RPC already reads `role` as text, so approval flow is unaffected

## Technical detail
The enum `user_role` was created in the very first migration with only `('admin', 'employee')`. The RBAC system (`role_definitions` table) has since replaced it, but the `invitations` table column was never updated to match.

