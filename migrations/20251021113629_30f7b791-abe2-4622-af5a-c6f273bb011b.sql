-- Удаляем дублирующие роли из старой системы для всех пользователей,
-- у которых уже есть роли в новой системе (user_role_assignments)

-- Сначала удаляем конкретную запись для пользователя "Фантазер"
DELETE FROM public.user_roles
WHERE user_id = '93c5776a-bd4a-4753-b965-df8d0b302916'
AND role = 'employee'::app_role
AND revoked_at IS NULL;

-- Затем очищаем всех остальных пользователей с дублирующими ролями
-- Удаляем все записи из старой системы для пользователей,
-- у которых уже есть роли в новой системе
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.user_role_assignments
)
AND revoked_at IS NULL;