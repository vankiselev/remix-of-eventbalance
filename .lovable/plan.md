

## План: Исправление ошибки "infinite recursion" при загрузке аватара

### Проблема

Обнаружено **два конфликтующих миграционных файла** с разными политиками для storage.objects:

1. **`20260127_fix_avatars_storage_policies.sql`** - проверяет путь через `storage.foldername(name)` и `storage.filename(name)`
2. **`20260127_fix_storage_recursion.sql`** - проверяет `name ~ ('^' || auth.uid()::text)` (путь должен начинаться с user ID)

При этом код загружает файлы по пути: `avatars/USER_ID.jpg`

**Политика из второго файла некорректна**: она ожидает, что `name` начинается с `auth.uid()`, но реально путь начинается с `avatars/`.

Также ошибки `CHANNEL_ERROR` в Realtime указывают на проблемы с подключением к Supabase.

### Решение

1. **Создать единую корректную миграцию** которая удалит все конфликтующие политики и создаст правильные
2. **Исправить путь проверки** - использовать `storage.filename(name)` для проверки владельца

### Новая миграция

**Файл:** `migrations/20260128_fix_avatars_final.sql`

```sql
-- Окончательное исправление политик для bucket avatars
-- Удаляем ВСЕ существующие политики для avatars

-- Динамическое удаление всех политик связанных с avatar
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        IF pol.policyname ILIKE '%avatar%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        END IF;
    END LOOP;
END $$;

-- Явное удаление политик по имени
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

-- Пересоздание bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Простые политики БЕЗ join-ов с другими таблицами

-- 1. SELECT - публичный доступ
CREATE POLICY "avatar_bucket_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. INSERT - только свои файлы
-- Путь: avatars/USER_ID.jpg, проверяем что filename начинается с auth.uid()
CREATE POLICY "avatar_bucket_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND storage.filename(name) LIKE (auth.uid()::text || '%')
);

-- 3. UPDATE - только свои файлы
CREATE POLICY "avatar_bucket_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'))
WITH CHECK (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'));

-- 4. DELETE - только свои файлы
CREATE POLICY "avatar_bucket_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND storage.filename(name) LIKE (auth.uid()::text || '%'));
```

### Также нужно исправить код удаления старого аватара

В `ProfilePage.tsx` есть баг в логике удаления:

```typescript
// Текущий код (строки 138-145):
if (avatarUrl) {
  const oldPath = avatarUrl.split('/').pop()?.split('?')[0];
  if (oldPath) {
    await supabase.storage
      .from('avatars')
      .remove([`avatars/${oldPath}`]);  // Ошибка! Двойной путь
  }
}
```

URL выглядит как: `.../avatars/avatars/USER_ID.jpg?v=...`

При извлечении `oldPath` получаем `USER_ID.jpg`, затем добавляем `avatars/` → получаем `avatars/USER_ID.jpg`, что корректно.

НО! Bucket уже называется `avatars`, поэтому путь внутри bucket должен быть просто `avatars/USER_ID.jpg`.

Нужно проверить правильность пути.

### Файлы для изменения

| Файл | Действие |
|------|----------|
| `migrations/20260128_fix_avatars_final.sql` | Создать |
| `src/pages/ProfilePage.tsx` | Проверить/исправить путь удаления |

### После применения миграции

1. GitHub Actions применит новую миграцию автоматически
2. Все старые политики будут удалены
3. Новые простые политики без join-ов предотвратят рекурсию
4. Загрузка аватаров должна заработать

