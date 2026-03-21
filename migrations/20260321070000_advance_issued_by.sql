-- Add columns to track who issued the advance and when
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS advance_issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS advance_issued_at timestamptz;

-- Comment
COMMENT ON COLUMN profiles.advance_issued_by IS 'UUID профиля сотрудника, который выдал аванс';
COMMENT ON COLUMN profiles.advance_issued_at IS 'Дата/время выдачи аванса';
