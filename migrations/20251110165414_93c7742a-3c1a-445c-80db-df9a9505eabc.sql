-- Create transaction_projects table for managing project categories
CREATE TABLE IF NOT EXISTS public.transaction_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_projects ENABLE ROW LEVEL SECURITY;

-- Everyone can view active projects
CREATE POLICY "Everyone can view active projects"
  ON public.transaction_projects
  FOR SELECT
  USING (is_active = true);

-- Admins can insert projects
CREATE POLICY "Admins can insert projects"
  ON public.transaction_projects
  FOR INSERT
  WITH CHECK (is_admin_user(auth.uid()));

-- Admins can update projects
CREATE POLICY "Admins can update projects"
  ON public.transaction_projects
  FOR UPDATE
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON public.transaction_projects
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Insert existing static projects
INSERT INTO public.transaction_projects (name, display_order, is_active) VALUES
  ('Расходы вне проекта', 1, true),
  ('Передача денег', 2, true),
  ('Склад / Офис', 3, true),
  ('Оплата связи и сервисов', 4, true),
  ('Уплата налогов', 5, true),
  ('Новогодняя премия', 6, true),
  ('Депозит', 7, true),
  ('Бонус', 8, true),
  ('Оклад Январь', 9, true),
  ('Оклад Февраль', 10, true),
  ('Оклад Март', 11, true),
  ('Оклад Апрель', 12, true),
  ('Оклад Май', 13, true),
  ('Оклад Июнь', 14, true),
  ('Оклад Июль', 15, true),
  ('Оклад Август', 16, true),
  ('Оклад Сентябрь', 17, true),
  ('Оклад Октябрь', 18, true),
  ('Оклад Ноябрь', 19, true),
  ('Оклад Декабрь', 20, true)
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_transaction_projects_updated_at
  BEFORE UPDATE ON public.transaction_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();