-- Обновляем функцию get_current_user_role() чтобы она проверяла новую систему ролей
-- из таблиц user_role_assignments и role_definitions

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