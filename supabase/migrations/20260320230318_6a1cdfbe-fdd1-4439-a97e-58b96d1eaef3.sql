-- Fix project_owner abbreviations in existing events
UPDATE public.events 
SET project_owner = 'Ваня', updated_at = now()
WHERE project_owner = 'В';

UPDATE public.events 
SET project_owner = 'Настя', updated_at = now()
WHERE project_owner = 'Н';

UPDATE public.events 
SET project_owner = 'Лера', updated_at = now()
WHERE project_owner = 'Л';

-- Also handle lowercase
UPDATE public.events 
SET project_owner = 'Ваня', updated_at = now()
WHERE project_owner = 'в';

UPDATE public.events 
SET project_owner = 'Настя', updated_at = now()
WHERE project_owner = 'н';

UPDATE public.events 
SET project_owner = 'Лера', updated_at = now()
WHERE project_owner = 'л';