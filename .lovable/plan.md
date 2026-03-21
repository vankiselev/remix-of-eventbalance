

## Diagnosis

I identified two issues causing the transfer invisibility for the recipient:

### Issue 1: Notification INSERT blocked by RLS

The `notifications` table has an RLS policy from migration `20260119173000` that restricts INSERT to `user_id = auth.uid()` (users can only insert notifications for themselves). The fix migration `20260320_allow_notifications_insert.sql` has a non-standard filename that the GitHub Actions workflow likely didn't pick up for the self-hosted DB.

Result: When employee Petr tries to insert a notification for admin Ivan, the INSERT silently fails.

### Issue 2: Pending transfer not visible

The `MoneyTransferRequests` component queries `transfer_to_user_id = user.id` (auth.uid()). If `loadEmployees` selects `profiles.id` as the employee identifier (because `user_id` column may not exist or behaves differently on the self-hosted DB), the stored `transfer_to_user_id` might not match the recipient's `auth.uid()`.

Additionally, the notification INSERT failure means the recipient has no way to discover the pending transfer.

## Plan

### Step 1: Create a properly-named migration for notification INSERT RLS

Create `migrations/20260321234000_<uuid>.sql` that adds a permissive INSERT policy allowing any authenticated user to insert notifications for any other user. This ensures the GitHub Actions workflow picks it up.

### Step 2: Add diagnostic logging to transfer submission

In `TransactionFormNew.tsx`, add `console.log` statements before the transaction INSERT and notification INSERT showing:
- `transferToUserId` being stored
- Employee list with IDs
- Notification insert result (error or success)

### Step 3: Make MoneyTransferRequests query more robust

In `MoneyTransferRequests.tsx`, after the primary query by `user.id`, also check if there's a profile with a different `id` vs `user_id` and query with the alternate ID. This handles the self-hosted DB scenario where `profiles.id` may differ from `auth.uid()`.

### Step 4: Add fallback in transfer notification delivery

Create a server-side SQL function `notify_money_transfer` (SECURITY DEFINER) that inserts the notification, bypassing RLS entirely. Call this function via RPC from the form submission instead of direct table INSERT.

### Technical Details

```text
Current flow (broken for non-admin senders):
  Petr (employee) → INSERT notification → RLS BLOCKS (user_id ≠ auth.uid())
  
Fixed flow:
  Petr (employee) → RPC notify_money_transfer() → SECURITY DEFINER bypasses RLS → notification created
```

Files to modify:
- `src/components/finance/TransactionFormNew.tsx` — use RPC for notification, add logging
- `src/components/finance/MoneyTransferRequests.tsx` — robust ID matching
- New migration — RPC function + RLS fix

