-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.delete_employee_permanently(uuid);

-- Создаем новую функцию с исправленным именем параметра
CREATE OR REPLACE FUNCTION public.delete_employee_permanently(p_employee_user_id uuid)
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
  IF p_employee_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete yourself';
  END IF;

  -- Delete vacations
  DELETE FROM public.vacations WHERE user_id = p_employee_user_id;
  
  -- Delete chat participants
  DELETE FROM public.chat_participants WHERE user_id = p_employee_user_id;
  
  -- Delete push subscriptions
  DELETE FROM public.push_subscriptions WHERE user_id = p_employee_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_employee_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = p_employee_user_id;
  
  -- Delete user role assignments
  DELETE FROM public.user_role_assignments WHERE user_id = p_employee_user_id;
  
  -- Delete profile edit history
  DELETE FROM public.profile_edit_history WHERE profile_id = p_employee_user_id;
  
  -- Delete employees record
  DELETE FROM public.employees WHERE user_id = p_employee_user_id;
  
  -- Delete financial attachments
  DELETE FROM public.financial_attachments 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = p_employee_user_id
  );
  
  -- Delete financial audit logs
  DELETE FROM public.financial_audit_log 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = p_employee_user_id
  );
  
  -- Delete transaction verifications
  DELETE FROM public.transaction_verifications 
  WHERE transaction_id IN (
    SELECT id FROM public.financial_transactions WHERE created_by = p_employee_user_id
  );
  
  -- Delete financial transactions
  DELETE FROM public.financial_transactions WHERE created_by = p_employee_user_id;
  
  -- Delete events
  DELETE FROM public.events WHERE created_by = p_employee_user_id;
  
  -- Delete event reports
  DELETE FROM public.event_reports WHERE user_id = p_employee_user_id;
  
  -- Delete event report salaries
  DELETE FROM public.event_report_salaries 
  WHERE event_report_salaries.employee_user_id = p_employee_user_id;
  
  -- Delete expenses
  DELETE FROM public.expenses WHERE created_by = p_employee_user_id;
  
  -- Delete incomes
  DELETE FROM public.incomes WHERE created_by = p_employee_user_id;
  
  -- Delete chat rooms
  DELETE FROM public.chat_rooms WHERE created_by = p_employee_user_id;
  
  -- Delete messages
  DELETE FROM public.messages WHERE sender_id = p_employee_user_id;
  
  -- Delete profiles
  DELETE FROM public.profiles WHERE id = p_employee_user_id;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_employee_user_id;

  RETURN true;
END;
$$;