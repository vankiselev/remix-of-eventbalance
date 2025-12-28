-- Удаляем таблицы мессенджера (с CASCADE для зависимостей)
DROP TABLE IF EXISTS public.message_read_status CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;