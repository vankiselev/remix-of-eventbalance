-- Update RLS policies to block terminated employees from viewing data

-- 1. Update events table policies
DROP POLICY IF EXISTS "All authenticated users can view events" ON events;

CREATE POLICY "Active employees can view events"
ON events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.employment_status = 'active'
  )
);

-- 2. Update financial_transactions SELECT policy
DROP POLICY IF EXISTS "Users can view their own transactions, admins can view all" ON financial_transactions;

CREATE POLICY "Active users can view their transactions, admins view all"
ON financial_transactions FOR SELECT
USING (
  (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.employment_status = 'active'
    )
  )
  OR get_user_role(auth.uid()) = 'admin'::user_role
);

-- 3. Update vacations SELECT policy
DROP POLICY IF EXISTS "Все сотрудники могут видеть отпуска" ON vacations;

CREATE POLICY "Active employees can view vacations"
ON vacations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.employment_status = 'active'
  )
);

-- 4. Update profiles SELECT policy for terminated users (they should not access the system at all)
-- Keep existing policies but ensure terminated users can't see anything

-- 5. Block terminated users from other tables as well
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Active users can view their own notifications"
ON notifications FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.employment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Active users can update their own notifications"
ON notifications FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.employment_status = 'active'
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.employment_status = 'active'
  )
);

-- 6. Create a helper function to check if user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND employment_status = 'active'
  );
$$;