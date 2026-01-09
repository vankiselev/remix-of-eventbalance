-- ===================================================================
-- RBAC CLEANUP: Remove incorrect permissions and fix RLS policies
-- ===================================================================

-- Step 1: Clean up employee role permissions
-- Remove admin-like permissions from employee role
DELETE FROM public.role_permissions 
WHERE role_id = (SELECT id FROM public.role_definitions WHERE code = 'employee')
AND permission_id IN (
  SELECT id FROM public.permissions 
  WHERE code IN (
    'transactions.approve',
    'transactions.reject',
    'staff.manage',
    'staff.edit_all',
    'staff.view_all',
    'system.settings',
    'system.roles',
    'system.invitations'
  )
);

-- Step 2: Clean up accountant role permissions  
-- Remove staff management and system permissions from accountant
DELETE FROM public.role_permissions
WHERE role_id = (SELECT id FROM public.role_definitions WHERE code = 'accountant')
AND permission_id IN (
  SELECT id FROM public.permissions
  WHERE code IN (
    'staff.manage',
    'staff.edit_all', 
    'staff.view_all',
    'system.settings',
    'system.roles',
    'system.invitations'
  )
);

-- Step 3: Update RLS policies to use is_admin_user consistently
-- Fix events table policies
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events" 
ON public.events 
FOR ALL 
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Fix expenses table policies  
DROP POLICY IF EXISTS "Admins can manage all expenses" ON public.expenses;
CREATE POLICY "Admins can manage all expenses"
ON public.expenses
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Fix incomes table policies
DROP POLICY IF EXISTS "Admins can manage all incomes" ON public.incomes;
CREATE POLICY "Admins can manage all incomes"
ON public.incomes
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Fix employees table policies
DROP POLICY IF EXISTS "Admins can manage all employee records including salary" ON public.employees;
CREATE POLICY "Admins can manage all employee records including salary"
ON public.employees
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all employee data including salary" ON public.employees;
CREATE POLICY "Admins can view all employee data including salary"
ON public.employees
FOR SELECT
USING (is_admin_user(auth.uid()));

-- Fix vacations table policies
DROP POLICY IF EXISTS "Администраторы могут управлять вс" ON public.vacations;
CREATE POLICY "Admins can manage all vacations"
ON public.vacations
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Fix invitations table policies
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.invitations;
CREATE POLICY "Admins can manage all invitations"
ON public.invitations
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

-- Fix financial_transactions policies
DROP POLICY IF EXISTS "Users can delete their own transactions, admins can delete all" ON public.financial_transactions;
CREATE POLICY "Users can delete their own transactions, admins can delete all"
ON public.financial_transactions
FOR DELETE
USING ((auth.uid() = created_by) OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own transactions, admins can update all" ON public.financial_transactions;
CREATE POLICY "Users can update their own transactions, admins can update all"
ON public.financial_transactions
FOR UPDATE
USING ((auth.uid() = created_by) OR is_admin_user(auth.uid()))
WITH CHECK ((auth.uid() = created_by) OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Active users can view their transactions, admins view all" ON public.financial_transactions;
CREATE POLICY "Active users can view their transactions, admins view all"
ON public.financial_transactions
FOR SELECT
USING (
  ((auth.uid() = created_by) AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND employment_status = 'active'
  ))) 
  OR is_admin_user(auth.uid())
);

-- Fix financial_attachments policies
DROP POLICY IF EXISTS "Users can delete their own attachments and admins can delete al" ON public.financial_attachments;
CREATE POLICY "Users can delete their own attachments and admins can delete all"
ON public.financial_attachments
FOR DELETE
USING ((auth.uid() = created_by) OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own attachments and admins can view all" ON public.financial_attachments;
CREATE POLICY "Users can view their own attachments and admins can view all"
ON public.financial_attachments
FOR SELECT
USING ((auth.uid() = created_by) OR is_admin_user(auth.uid()));

-- Fix financial_audit_log policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.financial_audit_log;
CREATE POLICY "Admins can view all audit logs"
ON public.financial_audit_log
FOR SELECT
USING (is_admin_user(auth.uid()));

-- Fix invitation_audit_log policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.invitation_audit_log;
CREATE POLICY "Admins can view all audit logs"
ON public.invitation_audit_log
FOR SELECT
USING (is_admin_user(auth.uid()));

-- Fix event_report_salaries policies
DROP POLICY IF EXISTS "Admins can manage all event report salaries" ON public.event_report_salaries;
CREATE POLICY "Admins can manage all event report salaries"
ON public.event_report_salaries
FOR ALL
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));