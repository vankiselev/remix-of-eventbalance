

## Problem

When an admin approves a pending employee (changes `invitation_status` from `pending` to `invited`), the employee only sees the status change via realtime subscription. No email is sent to notify them they can start using the system.

## Solution

Create a new edge function `send-approval-email` that sends an email via Resend, and call it from `PendingUsersManagement.tsx` after the approval succeeds.

## Changes

### 1. New edge function: `supabase/functions/send-approval-email/index.ts`

- Accepts `{ email, firstName, lastName }` in the request body
- Uses the existing pattern from `send-invitation-email` (Resend via `system_secrets`, same `from` address)
- Sends an HTML email with subject "Доступ одобрен — EventBalance" telling the user their account is activated and they can log in
- Includes a link to the login page (`${siteUrl}/auth`)

### 2. Update `src/components/admin/PendingUsersManagement.tsx`

After the successful approval (line ~152, after `toast.success`), invoke the new edge function:

```typescript
await supabase.functions.invoke('send-approval-email', {
  body: { email: user.email, firstName: user.first_name, lastName: user.last_name }
});
```

This is a fire-and-forget call — if the email fails, the approval still succeeds (wrapped in try/catch with console.error).

### 3. Deploy the edge function

Deploy `send-approval-email` so it's available immediately.

## Technical Details

- Reuses the existing Resend integration and `getSystemSecrets` shared utility
- Same CORS headers and email sender (`EventBalance <noreply@eventbalance.ru>`)
- Email content: congratulations message, explanation that the account is active, CTA button to log in

