-- Update project_owner values to full names
UPDATE public.events 
SET project_owner = 'Ваня' 
WHERE project_owner = 'В';

UPDATE public.events 
SET project_owner = 'Настя' 
WHERE project_owner = 'Н';

UPDATE public.events 
SET project_owner = 'Лера' 
WHERE project_owner = 'Л';