-- Расширение таблицы financial_transactions для системы проверки
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'not_required')),
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_comment text,
ADD COLUMN IF NOT EXISTS requires_verification boolean DEFAULT true;

-- Создание таблицы истории проверок
CREATE TABLE IF NOT EXISTS public.transaction_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  verified_by uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  comment text,
  old_status text,
  new_status text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Включить RLS для transaction_verifications
ALTER TABLE public.transaction_verifications ENABLE ROW LEVEL SECURITY;

-- Создание роли "Бухгалтер" в системе ролей
INSERT INTO public.role_definitions (name, code, description, is_system, is_admin_role)
VALUES 
  ('Бухгалтер', 'accountant', 'Проверка и утверждение финансовых транзакций', false, false)
ON CONFLICT (code) DO NOTHING;

-- Создание прав доступа для бухгалтера
INSERT INTO public.permissions (code, category, name, description, scope_type)
VALUES 
  ('transactions.review', 'Финансы', 'Проверка транзакций', 'Право просматривать транзакции на проверке', 'all'),
  ('transactions.approve', 'Финансы', 'Утверждение транзакций', 'Право утверждать транзакции', 'all'),
  ('transactions.reject', 'Финансы', 'Отклонение транзакций', 'Право отклонять транзакции', 'all'),
  ('transactions.view_all', 'Финансы', 'Просмотр всех транзакций', 'Право видеть все транзакции на проверке', 'all')
ON CONFLICT (code) DO NOTHING;

-- RLS политики для transaction_verifications
CREATE POLICY "Accountants and admins can view all verifications"
ON public.transaction_verifications
FOR SELECT
USING (
  has_permission('transactions.view_all') OR 
  is_admin_user(auth.uid())
);

CREATE POLICY "Employees can view verifications of their transactions"
ON public.transaction_verifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.financial_transactions
    WHERE financial_transactions.id = transaction_verifications.transaction_id
    AND financial_transactions.created_by = auth.uid()
  )
);

CREATE POLICY "Accountants can insert verifications"
ON public.transaction_verifications
FOR INSERT
WITH CHECK (
  has_permission('transactions.approve') OR 
  has_permission('transactions.reject') OR
  is_admin_user(auth.uid())
);

-- Обновление RLS политик для financial_transactions
-- Бухгалтеры могут видеть все транзакции на проверке
CREATE POLICY "Accountants can view all pending transactions"
ON public.financial_transactions
FOR SELECT
USING (
  has_permission('transactions.view_all') OR
  has_permission('transactions.review')
);

-- Бухгалтеры могут обновлять статус проверки
CREATE POLICY "Accountants can update transaction verification status"
ON public.financial_transactions
FOR UPDATE
USING (
  has_permission('transactions.approve') OR 
  has_permission('transactions.reject') OR
  is_admin_user(auth.uid())
);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_verification_status 
ON public.financial_transactions(verification_status);

CREATE INDEX IF NOT EXISTS idx_transactions_verified_by 
ON public.financial_transactions(verified_by);

CREATE INDEX IF NOT EXISTS idx_transaction_verifications_transaction_id 
ON public.transaction_verifications(transaction_id);

-- Триггер для автоматического обновления updated_at в transaction_verifications
CREATE TRIGGER update_transaction_verifications_updated_at
BEFORE UPDATE ON public.transaction_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();