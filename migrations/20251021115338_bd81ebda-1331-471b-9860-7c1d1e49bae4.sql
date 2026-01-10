-- Обновляем триггер для разрешения системных обновлений ролей
-- Когда auth.uid() IS NULL - это системная операция (миграция или SECURITY DEFINER функция)

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Разрешаем системные обновления (когда нет текущего пользователя)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Super admin can change everything
  IF has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Regular admins can change everything except other admins' roles
  IF has_role(auth.uid(), 'admin') THEN
    -- Cannot change role of other admins or super admins
    IF OLD.id != auth.uid() AND OLD.role IS DISTINCT FROM NEW.role THEN
      IF has_role(OLD.id, 'admin') OR has_role(OLD.id, 'super_admin') THEN
        RAISE EXCEPTION 'Недостаточно прав для изменения роли администратора';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Regular users can update their own profile
  IF auth.uid() = NEW.id THEN
    -- Prevent changes to protected fields
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения роли';
    END IF;

    IF OLD.cash_nastya IS DISTINCT FROM NEW.cash_nastya 
       OR OLD.cash_lera IS DISTINCT FROM NEW.cash_lera 
       OR OLD.cash_vanya IS DISTINCT FROM NEW.cash_vanya 
       OR OLD.total_cash_on_hand IS DISTINCT FROM NEW.total_cash_on_hand THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения финансовых данных';
    END IF;

    IF OLD.google_sheet_id IS DISTINCT FROM NEW.google_sheet_id 
       OR OLD.google_drive_folder_id IS DISTINCT FROM NEW.google_drive_folder_id 
       OR OLD.google_sheet_url IS DISTINCT FROM NEW.google_sheet_url 
       OR OLD.google_drive_folder_url IS DISTINCT FROM NEW.google_drive_folder_url THEN
      RAISE EXCEPTION 'Недостаточно прав для изменения интеграций';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Недостаточно прав для редактирования этого профиля';
END;
$function$;

-- Теперь обновляем роль Киселёва через прямой UPDATE (сработает, так как auth.uid() будет NULL в миграции)
UPDATE public.profiles
SET role = 'admin'
WHERE id = '93c5776a-bd4a-4753-b965-df8d0b302916';

-- И назначаем роль в RBAC системе (только если пользователь существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '93c5776a-bd4a-4753-b965-df8d0b302916') THEN
    DELETE FROM public.user_role_assignments
    WHERE user_id = '93c5776a-bd4a-4753-b965-df8d0b302916';

    INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, assigned_at)
    VALUES (
      '93c5776a-bd4a-4753-b965-df8d0b302916',
      (SELECT id FROM public.role_definitions WHERE code = 'admin'),
      '93c5776a-bd4a-4753-b965-df8d0b302916',
      now()
    );
  END IF;
END $$;