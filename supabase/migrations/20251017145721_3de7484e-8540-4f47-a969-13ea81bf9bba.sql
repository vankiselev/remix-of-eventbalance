-- Create category_icons table
CREATE TABLE IF NOT EXISTS public.category_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT UNIQUE NOT NULL,
  icon_type TEXT NOT NULL CHECK (icon_type IN ('lucide', 'upload', 'url')),
  icon_value TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT 'bg-gray-500/10',
  icon_color TEXT NOT NULL DEFAULT 'text-gray-600 dark:text-gray-400',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view category icons"
  ON public.category_icons
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert category icons"
  ON public.category_icons
  FOR INSERT
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update category icons"
  ON public.category_icons
  FOR UPDATE
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete category icons"
  ON public.category_icons
  FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Create storage bucket for category icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for category icons
CREATE POLICY "Public can view category icons"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'category-icons');

CREATE POLICY "Admins can upload category icons"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'category-icons' AND
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update category icons"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'category-icons' AND
    is_admin_user(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'category-icons' AND
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete category icons"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'category-icons' AND
    is_admin_user(auth.uid())
  );

-- Insert default icon configurations from current CategoryIcon.tsx
INSERT INTO public.category_icons (category_name, icon_type, icon_value, bg_color, icon_color) VALUES
  ('Зарплата', 'lucide', 'User', 'bg-blue-500/10', 'text-blue-600 dark:text-blue-400'),
  ('Закупки', 'lucide', 'ShoppingCart', 'bg-orange-500/10', 'text-orange-600 dark:text-orange-400'),
  ('Аренда', 'lucide', 'Building', 'bg-purple-500/10', 'text-purple-600 dark:text-purple-400'),
  ('Услуги', 'lucide', 'Wrench', 'bg-yellow-500/10', 'text-yellow-600 dark:text-yellow-400'),
  ('Прочее', 'lucide', 'Package', 'bg-gray-500/10', 'text-gray-600 dark:text-gray-400'),
  ('От клиентов', 'lucide', 'Wallet', 'bg-green-500/10', 'text-green-600 dark:text-green-400'),
  ('Аванс', 'lucide', 'CreditCard', 'bg-emerald-500/10', 'text-emerald-600 dark:text-emerald-400'),
  ('Другое', 'lucide', 'TrendingUp', 'bg-teal-500/10', 'text-teal-600 dark:text-teal-400')
ON CONFLICT (category_name) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_category_icons_updated_at
  BEFORE UPDATE ON public.category_icons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();