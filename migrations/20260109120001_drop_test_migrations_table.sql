-- Удаление тестовой таблицы test_migrations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_migrations') THEN
    DROP POLICY IF EXISTS "Anyone can view test data" ON public.test_migrations;
    DROP TABLE public.test_migrations;
  END IF;
END
$$;

