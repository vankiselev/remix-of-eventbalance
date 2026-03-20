-- Fix project_owner abbreviations in events table
-- Replace single-letter codes with full names
UPDATE public.events 
SET project_owner = 'Ваня', updated_at = now()
WHERE TRIM(project_owner) IN ('В', 'в');

UPDATE public.events 
SET project_owner = 'Настя', updated_at = now()
WHERE TRIM(project_owner) IN ('Н', 'н');

UPDATE public.events 
SET project_owner = 'Лера', updated_at = now()
WHERE TRIM(project_owner) IN ('Л', 'л');

-- Fix project_owner abbreviations in financial_transactions table
UPDATE public.financial_transactions 
SET project_owner = 'Ваня', updated_at = now()
WHERE TRIM(project_owner) IN ('В', 'в');

UPDATE public.financial_transactions 
SET project_owner = 'Настя', updated_at = now()
WHERE TRIM(project_owner) IN ('Н', 'н');

UPDATE public.financial_transactions 
SET project_owner = 'Лера', updated_at = now()
WHERE TRIM(project_owner) IN ('Л', 'л');
