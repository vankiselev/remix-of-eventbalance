-- Восстановление legacy системы ролей (откат миграции 20260119150000)

-- 1. Восстанавливаем таблицу user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_at ON public.user_roles(revoked_at) WHERE revoked_at IS NULL;

-- RLS политики для user_roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all user_roles') THEN
    CREATE POLICY "Admins can view all user_roles"
      ON public.user_roles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
            AND ur.revoked_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can manage user_roles') THEN
    CREATE POLICY "Admins can manage user_roles"
      ON public.user_roles FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
            AND ur.revoked_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles') THEN
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- 2. Восстанавливаем функцию get_user_highest_role
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS public.app_role
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
      WHEN 'super_admin'::public.app_role THEN 1
      WHEN 'admin'::public.app_role THEN 2
      WHEN 'employee'::public.app_role THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

-- 3. Восстанавливаем has_role с fallback на user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- New RBAC system (user_role_assignments)
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = _user_id
        AND rd.code = (_role::text)
    )
    OR
    -- Old system (user_roles)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
        AND ur.revoked_at IS NULL
    )
    OR
    -- Legacy fallback: profiles.role = 'admin'
    (
      _role = 'admin'::app_role AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _user_id AND p.role = 'admin'::user_role
      )
    ), false);
$$;

-- 4. Восстанавливаем get_current_user_role с fallback
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(
      -- RBAC system: check if user has admin role
      (
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM public.user_role_assignments ura
          JOIN public.role_definitions rd ON rd.id = ura.role_id
          WHERE ura.user_id = auth.uid()
            AND rd.is_admin_role = true
        ) THEN 'admin'::user_role END
      ),
      -- Old system (user_roles)
      (
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin'::app_role, 'super_admin'::app_role)
            AND ur.revoked_at IS NULL
        ) THEN 'admin'::user_role END
      ),
      -- Legacy fallback: profiles.role
      (
        SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
      ),
      'employee'::user_role
    );
$$;

-- 5. Восстанавливаем get_user_profile_with_roles с legacy_roles
CREATE OR REPLACE FUNCTION public.get_user_profile_with_roles()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'last_name', p.last_name,
        'first_name', p.first_name,
        'middle_name', p.middle_name,
        'phone', p.phone,
        'birth_date', p.birth_date,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'employment_status', p.employment_status,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      FROM public.profiles p
      WHERE p.id = current_user_id
    ),
    'employee', (
      SELECT json_build_object(
        'id', e.id,
        'position', e.position,
        'hire_date', e.hire_date
      )
      FROM public.employees e
      WHERE e.user_id = current_user_id
    ),
    'rbac_roles', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'name', rd.name,
          'code', rd.code,
          'is_admin_role', rd.is_admin_role
        )
      ), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_definitions rd ON rd.id = ura.role_id
      WHERE ura.user_id = current_user_id
    ),
    'legacy_roles', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'role', ur.role,
          'assigned_at', ur.assigned_at
        )
      ), '[]'::json)
      FROM public.user_roles ur
      WHERE ur.user_id = current_user_id
        AND ur.revoked_at IS NULL
    ),
    'permissions', (
      SELECT COALESCE(json_agg(DISTINCT perm.code), '[]'::json)
      FROM public.user_role_assignments ura
      JOIN public.role_permissions rp ON rp.role_id = ura.role_id AND rp.granted = true
      JOIN public.permissions perm ON perm.id = rp.permission_id
      WHERE ura.user_id = current_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
