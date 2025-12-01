-- Добавить колонки для хранения данных импорта и отслеживания паузы
ALTER TABLE import_jobs 
ADD COLUMN IF NOT EXISTS import_data JSONB,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;

-- Добавить комментарии для документации
COMMENT ON COLUMN import_jobs.import_data IS 'Исходные данные импорта для возможности возобновления';
COMMENT ON COLUMN import_jobs.paused_at IS 'Время последнего обновления для определения застрявших импортов';