-- Заменяем сокращения на полные имена во всех мероприятиях
UPDATE public.events SET
  managers = REPLACE(REPLACE(REPLACE(managers, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  animators = REPLACE(REPLACE(REPLACE(animators, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  project_owner = REPLACE(REPLACE(REPLACE(project_owner, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  contractors = REPLACE(REPLACE(REPLACE(contractors, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  photo_video = REPLACE(REPLACE(REPLACE(photo_video, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  show_program = REPLACE(REPLACE(REPLACE(show_program, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  description = REPLACE(REPLACE(REPLACE(description, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  notes = REPLACE(REPLACE(REPLACE(notes, 'Л', 'Лера'), 'Н', 'Настя'), 'В', 'Ваня'),
  updated_at = now()
WHERE 
  managers LIKE '%Л%' OR managers LIKE '%Н%' OR managers LIKE '%В%' OR
  animators LIKE '%Л%' OR animators LIKE '%Н%' OR animators LIKE '%В%' OR
  project_owner LIKE '%Л%' OR project_owner LIKE '%Н%' OR project_owner LIKE '%В%' OR
  contractors LIKE '%Л%' OR contractors LIKE '%Н%' OR contractors LIKE '%В%' OR
  photo_video LIKE '%Л%' OR photo_video LIKE '%Н%' OR photo_video LIKE '%В%' OR
  show_program LIKE '%Л%' OR show_program LIKE '%Н%' OR show_program LIKE '%В%' OR
  description LIKE '%Л%' OR description LIKE '%Н%' OR description LIKE '%В%' OR
  notes LIKE '%Л%' OR notes LIKE '%Н%' OR notes LIKE '%В%';