-- Remove the dangerous policy that allows anyone to view reset tokens
DROP POLICY IF EXISTS "Anyone can view reset token by token" ON public.password_reset_tokens;

-- The remaining policy "Users can view their own reset tokens" is sufficient
-- Password reset validation should be handled by Supabase's auth system, not direct token queries