

## Problem

Migration `20260320_add_middle_name_and_avatars_bucket.sql` fails because PostgreSQL does not support `CREATE POLICY IF NOT EXISTS` syntax. The error:

```
ERROR: syntax error at or near "NOT"
LINE 1: CREATE POLICY IF NOT EXISTS "Authenticated users can upload ...
```

## Fix

Replace all `CREATE POLICY IF NOT EXISTS` with `DROP POLICY IF EXISTS` + `CREATE POLICY` pattern (same approach used in the working `20260320_tenant_logos_bucket.sql`).

## Changes

**File: `migrations/20260320_add_middle_name_and_avatars_bucket.sql`**

Replace lines 14-32 with:

```sql
-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');
```

This is the only failing migration. The `tenant_logos_bucket` migration already succeeded.

