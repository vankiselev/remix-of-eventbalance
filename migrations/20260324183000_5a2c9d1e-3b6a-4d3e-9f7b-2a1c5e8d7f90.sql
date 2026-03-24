-- Ensure invitation names are stored and backfilled for bulk invited users
-- Self-hosted safe and idempotent

DO $$
BEGIN
  IF to_regclass('public.invitations') IS NULL THEN
    RAISE NOTICE 'Skipping migration: public.invitations does not exist';
    RETURN;
  END IF;

  ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS first_name text;
  ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS last_name text;

  UPDATE public.invitations i
  SET
    first_name = COALESCE(NULLIF(i.first_name, ''), src.first_name),
    last_name = COALESCE(NULLIF(i.last_name, ''), src.last_name),
    updated_at = now()
  FROM (
    VALUES
      ('nastya.beloucova@gmail.com', 'Анастасия', 'Белоусова'),
      ('kolokolnikovaud@gmail.com', 'Ульяна', 'Колокольникова'),
      ('gssavushkina2022@gmail.com', 'Галина', 'Савушкина'),
      ('valerijapasternak23@gmail.com', 'Валерия', 'Пастернак'),
      ('Nikitagabov@yandex.ru', 'Никита', 'Габов'),
      ('ilona.khudieva@gmail.com', 'Илона', 'Худиева'),
      ('safonov.ni1999@gmail.com', 'Никита', 'Сафонов'),
      ('kolozubchikshmakajop@gmail.com', 'Камилла', 'Бавасулейманова'),
      ('kazanzh21@gmail.com', 'Анжелика', 'Казимова'),
      ('egorprimazchikov2015@mail.ru', 'Егор', 'Приказчиков'),
      ('rundzya@gmail.com', 'Паша', 'Рундзя'),
      ('buh.funtasy@yandex.ru', 'Александра', 'Детушева'),
      ('andreyzuz19@gmail.com', 'Андрей', 'Зюзин'),
      ('Ryzhovavika08@gmail.com', 'Вика', 'Рыжова'),
      ('dkekov@gmail.com', 'Дмитрий', 'Ларинов')
  ) AS src(email, first_name, last_name)
  WHERE lower(i.email) = lower(src.email)
    AND (
      i.first_name IS NULL OR i.first_name = '' OR
      i.last_name IS NULL OR i.last_name = ''
    );
END;
$$;
