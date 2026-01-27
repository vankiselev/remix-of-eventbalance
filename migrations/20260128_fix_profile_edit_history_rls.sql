-- Исправление RLS-политики для profile_edit_history
-- Старая политика проверяет profiles.role = 'admin', но роли теперь через RBAC

-- 1. Удаляем старую политику
DROP POLICY IF EXISTS "Admins can view all edit history" ON public.profile_edit_history;

-- 2. Создаём новую политику, использующую RBAC-проверку
CREATE POLICY "Admins can view all edit history"
ON public.profile_edit_history
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
);

-- Политика INSERT остаётся (WITH CHECK (true)) — записи создаются через SECURITY DEFINER функцию
