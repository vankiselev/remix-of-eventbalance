-- Удаляем записи отпусков для несуществующих пользователей
DELETE FROM public.vacations
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Добавляем foreign key для vacations.user_id с ON DELETE CASCADE
ALTER TABLE public.vacations
DROP CONSTRAINT IF EXISTS vacations_user_id_fkey;

ALTER TABLE public.vacations
ADD CONSTRAINT vacations_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Обновляем функцию удаления сотрудника для явного удаления всех данных
CREATE OR REPLACE FUNCTION public.delete_employee_permanently(employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can delete employees
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only administrators can delete employees';
  END IF;

  -- Cannot delete yourself
  IF employee_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete yourself';
  END IF;

  -- Delete vacations explicitly
  DELETE FROM public.vacations WHERE user_id = employee_user_id;
  
  -- Delete chat participants
  DELETE FROM public.chat_participants WHERE user_id = employee_user_id;
  
  -- Delete push subscriptions
  DELETE FROM public.push_subscriptions WHERE user_id = employee_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = employee_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = employee_user_id;
  
  -- Delete user role assignments
  DELETE FROM public.user_role_assignments WHERE user_id = employee_user_id;
  
  -- Delete profile edit history
  DELETE FROM public.profile_edit_history WHERE profile_id = employee_user_id;
  
  -- Delete employees record
  DELETE FROM public.employees WHERE user_id = employee_user_id;
  
  -- Delete financial attachments for this user's transactions
  DELETE FROM public.financial_attachments 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = employee_user_id
  );
  
  -- Delete financial audit logs
  DELETE FROM public.financial_audit_log 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = employee_user_id
  );
  
  -- Delete transaction verifications
  DELETE FROM public.transaction_verifications 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = employee_user_id
  );
  
  -- Delete financial transactions
  DELETE FROM public.financial_transactions WHERE created_by = employee_user_id;
  
  -- Delete events created by this user
  DELETE FROM public.events WHERE created_by = employee_user_id;
  
  -- Delete event reports
  DELETE FROM public.event_reports WHERE user_id = employee_user_id;
  
  -- Delete event report salaries
  DELETE FROM public.event_report_salaries WHERE employee_user_id = employee_user_id;
  
  -- Delete expenses
  DELETE FROM public.expenses WHERE created_by = employee_user_id;
  
  -- Delete incomes
  DELETE FROM public.incomes WHERE created_by = employee_user_id;
  
  -- Delete chat rooms created by this user
  DELETE FROM public.chat_rooms WHERE created_by = employee_user_id;
  
  -- Delete messages
  DELETE FROM public.messages WHERE sender_id = employee_user_id;
  
  -- Delete profiles
  DELETE FROM public.profiles WHERE id = employee_user_id;
  
  -- Delete from auth.users (will cascade remaining references)
  DELETE FROM auth.users WHERE id = employee_user_id;

  RETURN true;
END;
$$;