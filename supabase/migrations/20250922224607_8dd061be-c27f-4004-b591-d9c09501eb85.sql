-- Создаем таблицу для графика отпусков
CREATE TABLE public.vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vacation_type TEXT NOT NULL DEFAULT 'annual', -- annual, sick, personal
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем Row Level Security
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Сотрудники могут создавать свои отпуска" 
ON public.vacations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Сотрудники могут видеть все отпуска" 
ON public.vacations 
FOR SELECT 
USING (true);

CREATE POLICY "Сотрудники могут редактировать свои отпуска" 
ON public.vacations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Администраторы могут управлять всеми отпусками" 
ON public.vacations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Триггер для обновления updated_at
CREATE TRIGGER update_vacations_updated_at
BEFORE UPDATE ON public.vacations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();