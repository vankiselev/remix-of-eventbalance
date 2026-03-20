

## Problem

When an admin deletes an employee via `delete_employee_permanently`, the deleted user's browser session remains active because:

1. The realtime subscription only listens for `UPDATE` on profiles, not `DELETE`
2. The JWT token remains valid until it naturally expires
3. No periodic session validation exists

The deleted user can continue navigating the app until their token expires or they refresh.

## Solution

Two-layer protection:

### 1. Listen for profile DELETE events (instant)

In `AuthContext.tsx`, add a `DELETE` event listener on the `profiles` table. When the profile row is deleted, immediately sign the user out.

### 2. Periodic session health check (fallback)

Add an interval (every 60 seconds) that verifies the user's profile still exists in the database. If the profile is gone, force sign-out. This catches cases where the realtime event is missed.

## Changes

**File: `src/contexts/AuthContext.tsx`**

1. In the realtime subscription (line ~194), add a listener for `DELETE` events on the `profiles` table:
   - When a DELETE event matches the current user's id, call `signOut()` and show a toast message
   
2. Add a `useEffect` with a 60-second interval that runs a lightweight query (`select id from profiles where id = user.id`) to confirm the profile exists. If not found, force sign-out with a message.

3. In `loadUserData`, add a check: if the profile query returns no data (null/empty), treat it the same as terminated — sign out and redirect.

## Technical Details

```text
Realtime channel update:
  Current:  UPDATE on profiles (filter: id=eq.user.id)
  Add:      DELETE on profiles (filter: id=eq.user.id)

New interval check:
  Every 60s → SELECT id FROM profiles WHERE id = user.id
  If no rows → signOut() + toast "Ваш аккаунт был удалён"
  
loadUserData guard:
  If profile is null after RPC call → signOut + redirect
```

