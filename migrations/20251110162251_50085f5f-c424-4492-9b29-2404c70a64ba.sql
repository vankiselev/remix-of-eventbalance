-- Create table for transaction categories
CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
CREATE POLICY "Everyone can view active categories"
ON public.transaction_categories
FOR SELECT
USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can insert categories"
ON public.transaction_categories
FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update categories"
ON public.transaction_categories
FOR UPDATE
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete categories"
ON public.transaction_categories
FOR DELETE
USING (is_admin_user(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_transaction_categories_updated_at
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing categories from constants
INSERT INTO public.transaction_categories (name, display_order, is_active) VALUES
  ('Агентская комиссия', 1, true),
  ('Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)', 2, true),
  ('Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)', 3, true),
  ('Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', 4, true),
  ('Выступление артистов (диджеи, селебрити, кавер-группы)', 5, true),
  ('Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)', 6, true),
  ('Доставка / Трансфер / Парковка / Вывоз мусора', 7, true),
  ('Еда / Напитки (сладкий стол, торт, кейтеринг)', 8, true),
  ('Закупки / Оплаты (ФИН, офис, склад, компания)', 9, true),
  ('Залог (внесли/вернули)', 10, true),
  ('Комиссия за перевод', 11, true),
  ('Монтаж / Демонтаж', 12, true),
  ('Накладные расходы (райдер, траты вне сметы)', 13, true),
  ('Передано или получено от Леры/Насти/Вани', 14, true),
  ('Передано или получено от сотрудника', 15, true),
  ('Печать (баннеры, меню, карточки)', 16, true),
  ('Площадка (депозит, аренда, доп. услуги)', 17, true),
  ('Получено/Возвращено клиенту', 18, true),
  ('Производство (декорации, костюмы)', 19, true),
  ('Прочие специалисты', 20, true),
  ('Фотограф / Видеограф', 21, true),
  ('Налог / УСН', 22, true),
  ('Депозит (не выбирать)', 23, true)
ON CONFLICT (name) DO NOTHING;