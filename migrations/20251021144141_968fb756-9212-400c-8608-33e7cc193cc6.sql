
-- Обновляем profiles.role для пользователя Фантазер с admin на employee
-- так как в новой RBAC системе у него роль Финансист (не админская)
UPDATE public.profiles
SET role = 'employee'::user_role
WHERE id = '93c5776a-bd4a-4753-b965-df8d0b302916'
  AND role = 'admin'::user_role;
