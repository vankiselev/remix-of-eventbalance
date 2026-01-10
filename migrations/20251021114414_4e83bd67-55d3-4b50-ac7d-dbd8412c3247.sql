-- Обновляем функцию get_current_user_role() чтобы она проверяла новую систему ролей
-- из таблиц user_role_assignments и role_definitions

-- First, create get_user_highest_role() if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND revoked_at IS NULL
  ORDER BY
    CASE role
      WHEN 'super_admin'::app_role THEN 1
      WHEN 'admin'::app_role THEN 2
      WHEN 'employee'::app_role THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      -- Проверяем новую систему ролей (user_role_assignments + role_definitions)
      WHEN EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN role_definitions rd ON ura.role_id = rd.id
        WHERE ura.user_id = auth.uid()
          AND rd.is_admin_role = true
      ) THEN 'admin'::user_role
      
      -- Проверяем старую систему ролей (user_roles с app_role)
      WHEN get_user_highest_role(auth.uid()) IN ('admin'::app_role, 'super_admin'::app_role) 
        THEN 'admin'::user_role
      
      -- По умолчанию - employee
      ELSE 'employee'::user_role
    END;
$$;