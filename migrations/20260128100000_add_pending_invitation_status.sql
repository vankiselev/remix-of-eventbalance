-- Migration: Двухэтапная регистрация с приглашением администратора
-- Часть 1: Добавляем статус приглашения в profiles для контроля доступа

-- 1. Добавляем колонки для отслеживания статуса приглашения
-- Сначала добавляем колонку без NOT NULL чтобы заполнить дефолты
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'invitation_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_status text DEFAULT 'invited';
  END IF;
END $$;

-- Обновляем все существующие записи
UPDATE public.profiles SET invitation_status = 'invited' WHERE invitation_status IS NULL;

-- Теперь добавляем NOT NULL constraint
DO $$
BEGIN
  ALTER TABLE public.profiles ALTER COLUMN invitation_status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column invitation_status already NOT NULL';
END $$;

-- Добавляем CHECK constraint если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_invitation_status_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_invitation_status_check 
    CHECK (invitation_status IN ('pending', 'invited'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint profiles_invitation_status_check already exists';
END $$;

-- Добавляем invited_at колонку
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invited_at timestamp with time zone;
  END IF;
END $$;

-- Добавляем invited_by колонку
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invited_by uuid REFERENCES auth.users(id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Column invited_by already exists';
END $$;

-- 2. Создаем индекс для быстрого поиска ожидающих пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status 
ON public.profiles(invitation_status) 
WHERE invitation_status = 'pending';

-- Комментарии для документации
COMMENT ON COLUMN public.profiles.invitation_status IS 'Статус приглашения: pending = ожидает одобрения админа, invited = приглашен и имеет доступ';
COMMENT ON COLUMN public.profiles.invited_at IS 'Дата и время когда пользователь был приглашен администратором';
COMMENT ON COLUMN public.profiles.invited_by IS 'ID администратора который пригласил пользователя';
