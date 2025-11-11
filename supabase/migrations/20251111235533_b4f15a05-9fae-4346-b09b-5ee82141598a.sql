-- Fix Function Search Path Mutable warnings
-- Add SET search_path TO 'public' to all SECURITY DEFINER functions missing it

-- Fix calculate_all_users_cash
CREATE OR REPLACE FUNCTION public.calculate_all_users_cash()
RETURNS TABLE(user_id uuid, total_cash numeric, cash_nastya numeric, cash_lera numeric, cash_vanya numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_transactions AS (
    SELECT 
      ft.created_by,
      ft.cash_type,
      SUM(COALESCE(ft.income_amount, 0) - COALESCE(ft.expense_amount, 0)) as net_amount
    FROM financial_transactions ft
    GROUP BY ft.created_by, ft.cash_type
  ),
  pivoted AS (
    SELECT 
      created_by as user_id,
      SUM(CASE WHEN cash_type = 'nastya' THEN net_amount ELSE 0 END) as cash_nastya,
      SUM(CASE WHEN cash_type = 'lera' THEN net_amount ELSE 0 END) as cash_lera,
      SUM(CASE WHEN cash_type = 'vanya' THEN net_amount ELSE 0 END) as cash_vanya
    FROM user_transactions
    GROUP BY created_by
  )
  SELECT 
    p.user_id,
    (p.cash_nastya + p.cash_lera + p.cash_vanya) as total_cash,
    p.cash_nastya,
    p.cash_lera,
    p.cash_vanya
  FROM pivoted p;
END;
$function$;

-- Fix get_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_events', (SELECT COUNT(*) FROM events WHERE is_archived = false),
    'total_income', COALESCE((SELECT SUM(income_amount) FROM financial_transactions), 0),
    'total_expenses', COALESCE((SELECT SUM(expense_amount) FROM financial_transactions), 0),
    'profit', COALESCE((SELECT SUM(income_amount) - SUM(expense_amount) FROM financial_transactions), 0),
    'cash_nastya', COALESCE((
      SELECT SUM((income_amount - expense_amount))
      FROM financial_transactions
      WHERE cash_type = 'nastya'
    ), 0),
    'cash_lera', COALESCE((
      SELECT SUM((income_amount - expense_amount))
      FROM financial_transactions
      WHERE cash_type = 'lera'
    ), 0),
    'cash_vanya', COALESCE((
      SELECT SUM((income_amount - expense_amount))
      FROM financial_transactions
      WHERE cash_type = 'vanya'
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Fix get_user_full_context
CREATE OR REPLACE FUNCTION public.get_user_full_context(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'employment_status', p.employment_status,
        'phone', p.phone,
        'birth_date', p.birth_date
      )
      FROM profiles p
      WHERE p.id = user_uuid
    ),
    'roles', (
      SELECT json_agg(
        json_build_object(
          'name', rd.name,
          'code', rd.code,
          'is_admin_role', rd.is_admin_role
        )
      )
      FROM user_role_assignments ura
      JOIN role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = user_uuid
    ),
    'permissions', (
      SELECT COALESCE(
        json_agg(DISTINCT p.code),
        '[]'::json
      )
      FROM user_role_assignments ura
      JOIN role_permissions rp ON rp.role_id = ura.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ura.user_id = user_uuid AND rp.granted = true
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Fix update_chat_room_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_chat_room_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = now()
  WHERE id = NEW.chat_room_id;
  RETURN NEW;
END;
$function$;