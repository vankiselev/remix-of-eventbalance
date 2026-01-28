-- Migration: Функции для двухэтапной регистрации
-- Часть 2: Создаем функции после добавления колонок

-- Сначала дропаем get_user_profile_with_roles т.к. меняется структура возврата
DROP FUNCTION IF EXISTS public.get_user_profile_with_roles();

-- 1. Обновляем функцию handle_new_user для установки статуса pending при самостоятельной регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_meta jsonb;
  is_invited boolean;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  
  -- Проверяем, был ли пользователь приглашен (есть ли invitation_token в метаданных)
  is_invited := raw_meta ? 'invitation_token' OR raw_meta ? 'invited_by';
  
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name,
    last_name,
    middle_name,
    full_name, 
    role, 
    invitation_status,
    invited_at,
    invited_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(raw_meta ->> 'first_name', ''),
    COALESCE(raw_meta ->> 'last_name', ''),
    COALESCE(raw_meta ->> 'middle_name', ''),
    COALESCE(raw_meta ->> 'full_name', 'User'),
    'employee',
    CASE WHEN is_invited THEN 'invited' ELSE 'pending' END,
    CASE WHEN is_invited THEN now() ELSE NULL END,
    CASE WHEN is_invited THEN (raw_meta ->> 'invited_by')::uuid ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    middle_name = COALESCE(NULLIF(EXCLUDED.middle_name, ''), profiles.middle_name),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, 'User'), profiles.full_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Функция для приглашения ожидающего пользователя (только для админов)
CREATE OR REPLACE FUNCTION public.invite_pending_user(
  target_user_id uuid,
  role_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем что вызывающий - админ
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Требуются права администратора';
  END IF;
  
  -- Обновляем статус пользователя
  UPDATE public.profiles
  SET 
    invitation_status = 'invited',
    invited_at = now(),
    invited_by = auth.uid()
  WHERE id = target_user_id AND invitation_status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Пользователь не найден или уже приглашен';
  END IF;
  
  -- Назначаем RBAC роль
  INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by)
  VALUES (target_user_id, role_id_param, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET 
    role_id = role_id_param, 
    assigned_by = auth.uid(),
    assigned_at = now();
  
  RETURN true;
END;
$$;

-- 3. Функция для отклонения ожидающего пользователя (удаление аккаунта)
CREATE OR REPLACE FUNCTION public.reject_pending_user(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем что вызывающий - админ
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Требуются права администратора';
  END IF;
  
  -- Проверяем что пользователь в статусе pending
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id AND invitation_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Пользователь не найден или уже приглашен';
  END IF;
  
  -- Удаляем профиль (каскадное удаление удалит связанные записи)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Удаляем пользователя из auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- 4. Функция для получения списка ожидающих пользователей
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  full_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем что вызывающий - админ
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Требуются права администратора';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.full_name,
    p.created_at
  FROM public.profiles p
  WHERE p.invitation_status = 'pending'
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Обновляем get_user_profile_with_roles чтобы включать invitation_status
CREATE OR REPLACE FUNCTION public.get_user_profile_with_roles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_middle_name text;
  v_full_name text;
  v_avatar_url text;
  v_role text;
  v_employment_status text;
  v_termination_date date;
  v_invitation_status text;
  user_roles jsonb;
  user_permissions jsonb;
BEGIN
  -- Get profile data using explicit column selection
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.middle_name,
    p.full_name,
    p.avatar_url,
    p.role,
    p.employment_status,
    p.termination_date,
    p.invitation_status
  INTO 
    v_id,
    v_email,
    v_first_name,
    v_last_name,
    v_middle_name,
    v_full_name,
    v_avatar_url,
    v_role,
    v_employment_status,
    v_termination_date,
    v_invitation_status
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('profile', null, 'rbac_roles', '[]'::jsonb, 'permissions', '[]'::jsonb);
  END IF;
  
  -- Get RBAC roles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', rd.name,
      'code', rd.code,
      'is_admin_role', rd.is_admin_role
    )
  ), '[]'::jsonb)
  INTO user_roles
  FROM public.user_role_assignments ura
  JOIN public.role_definitions rd ON rd.id = ura.role_id
  WHERE ura.user_id = auth.uid();
  
  -- Get permissions through roles
  SELECT COALESCE(jsonb_agg(DISTINCT p.code), '[]'::jsonb)
  INTO user_permissions
  FROM public.user_role_assignments ura
  JOIN public.role_permissions rp ON rp.role_id = ura.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ura.user_id = auth.uid();
  
  -- Build result
  result := jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_id,
      'email', v_email,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'middle_name', v_middle_name,
      'full_name', v_full_name,
      'avatar_url', v_avatar_url,
      'role', v_role,
      'employment_status', v_employment_status,
      'termination_date', v_termination_date,
      'invitation_status', v_invitation_status
    ),
    'rbac_roles', user_roles,
    'permissions', user_permissions
  );
  
  RETURN result;
END;
$$;

-- Комментарии для документации
COMMENT ON FUNCTION public.invite_pending_user IS 'Приглашает ожидающего пользователя и назначает ему RBAC роль';
COMMENT ON FUNCTION public.reject_pending_user IS 'Отклоняет заявку пользователя и удаляет его аккаунт';
COMMENT ON FUNCTION public.get_pending_users IS 'Возвращает список пользователей ожидающих приглашения';
