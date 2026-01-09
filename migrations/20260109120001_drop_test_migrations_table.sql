-- Удаление тестовой таблицы test_migrations
DROP POLICY IF EXISTS "Anyone can view test data" ON public.test_migrations;
DROP TABLE IF EXISTS public.test_migrations;
