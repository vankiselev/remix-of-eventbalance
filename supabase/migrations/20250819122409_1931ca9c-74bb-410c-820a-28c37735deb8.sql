-- Исправляем предупреждения безопасности для функций телефонов
-- Сначала удаляем триггеры, затем функции

-- Удаляем триггеры
DROP TRIGGER IF EXISTS trigger_profiles_update_phone_e164 ON public.profiles;
DROP TRIGGER IF EXISTS trigger_animators_update_phone_e164 ON public.animators;
DROP TRIGGER IF EXISTS trigger_clients_update_phone_e164 ON public.clients;
DROP TRIGGER IF EXISTS trigger_contractors_update_phone_e164 ON public.contractors;
DROP TRIGGER IF EXISTS trigger_venues_update_phone_e164 ON public.venues;

-- Теперь можем удалить функции
DROP FUNCTION IF EXISTS public.update_phone_e164();
DROP FUNCTION IF EXISTS public.normalize_phone_to_e164(text);
DROP FUNCTION IF EXISTS public.format_phone_display(text);

-- Создаем функцию для нормализации телефонов в E.164 формат с безопасным search_path
CREATE OR REPLACE FUNCTION public.normalize_phone_to_e164(phone_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits text;
  normalized text;
BEGIN
  -- Если input пустой или null, возвращаем null
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Извлекаем только цифры
  digits := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Если нет цифр, возвращаем null
  IF digits = '' THEN
    RETURN NULL;
  END IF;
  
  -- Нормализация для российских номеров
  -- Если начинается с 8 и имеет 11 цифр, заменяем 8 на 7
  IF left(digits, 1) = '8' AND length(digits) = 11 THEN
    digits := '7' || substring(digits, 2);
  END IF;
  
  -- Если начинается с 7 и имеет 11 цифр, это валидный российский номер
  IF left(digits, 1) = '7' AND length(digits) = 11 THEN
    RETURN '+' || digits;
  END IF;
  
  -- Если 10 цифр, добавляем префикс +7
  IF length(digits) = 10 THEN
    RETURN '+7' || digits;
  END IF;
  
  -- Для всех остальных случаев возвращаем null (невалидный номер)
  RETURN NULL;
END;
$$;

-- Создаем функцию для форматирования телефона для отображения с безопасным search_path
CREATE OR REPLACE FUNCTION public.format_phone_display(phone_e164 text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  -- Если input пустой или null, возвращаем null
  IF phone_e164 IS NULL OR trim(phone_e164) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Извлекаем цифры
  digits := regexp_replace(phone_e164, '[^0-9]', '', 'g');
  
  -- Проверяем что это российский номер (11 цифр, начинается с 7)
  IF length(digits) = 11 AND left(digits, 1) = '7' THEN
    -- Форматируем как +7 (XXX) XXX-XX-XX
    RETURN '+7 (' || substring(digits, 2, 3) || ') ' || 
           substring(digits, 5, 3) || '-' || 
           substring(digits, 8, 2) || '-' || 
           substring(digits, 10, 2);
  END IF;
  
  -- Если не российский номер, возвращаем как есть
  RETURN phone_e164;
END;
$$;

-- Создаем триггерную функцию для автоматического обновления phone_e164 с безопасным search_path
CREATE OR REPLACE FUNCTION public.update_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Обновляем phone_e164 при изменении phone
  NEW.phone_e164 := public.normalize_phone_to_e164(NEW.phone);
  RETURN NEW;
END;
$$;

-- Создаем триггеры заново
CREATE TRIGGER trigger_profiles_update_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phone_e164();

CREATE TRIGGER trigger_animators_update_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.animators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phone_e164();

CREATE TRIGGER trigger_clients_update_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phone_e164();

CREATE TRIGGER trigger_contractors_update_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phone_e164();

CREATE TRIGGER trigger_venues_update_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phone_e164();