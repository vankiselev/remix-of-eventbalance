-- Исправляем политику безопасности для таблицы vacations
-- Удаляем старую небезопасную политику
DROP POLICY IF EXISTS "Сотрудники могут видеть все отпуска" ON public.vacations;

-- Создаем новую безопасную политику - пользователи видят только свои отпуска
CREATE POLICY "Пользователи видят только свои отпуска" 
ON public.vacations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Администраторы уже могут видеть все через существующую политику "Администраторы могут управлять всеми отпусками"

-- Создаем функцию для получения минимальной информации о текущих отпусках
-- Это позволит показывать "кто сегодня в отпуске" без раскрытия личных деталей
CREATE OR REPLACE FUNCTION public.get_current_vacations_summary()
RETURNS TABLE(
  employee_name TEXT,
  vacation_type TEXT
) 
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.employee_name,
    v.vacation_type
  FROM public.vacations v
  WHERE v.start_date <= CURRENT_DATE 
    AND v.end_date >= CURRENT_DATE
    AND v.status = 'approved';
$$;