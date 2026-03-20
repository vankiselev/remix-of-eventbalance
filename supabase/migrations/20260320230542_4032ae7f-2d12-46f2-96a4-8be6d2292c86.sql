-- Fix project_owner abbreviations (with trim for safety)
UPDATE public.events 
SET project_owner = 'Ваня', updated_at = now()
WHERE TRIM(project_owner) IN ('В', 'в');

UPDATE public.events 
SET project_owner = 'Настя', updated_at = now()
WHERE TRIM(project_owner) IN ('Н', 'н');

UPDATE public.events 
SET project_owner = 'Лера', updated_at = now()
WHERE TRIM(project_owner) IN ('Л', 'л');