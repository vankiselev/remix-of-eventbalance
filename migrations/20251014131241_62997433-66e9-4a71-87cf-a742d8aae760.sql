-- Permission-aware RLS for Contacts domain
-- 1) Create helper function to check RBAC permissions
CREATE OR REPLACE FUNCTION public.has_permission(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins always pass
  SELECT COALESCE(
    public.is_admin_user(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      JOIN public.role_permissions rp ON rp.role_id = ura.role_id AND rp.granted = true
      JOIN public.permissions perm ON perm.id = rp.permission_id
      WHERE ura.user_id = auth.uid()
        AND perm.code = p_code
    ), false);
$$;

-- 2) Update RLS policies for contacts tables to use has_permission
-- Contractors
DROP POLICY IF EXISTS "Only admins can view contractors" ON public.contractors;
DROP POLICY IF EXISTS "All authenticated users can view contractors" ON public.contractors;
CREATE POLICY "Can view contractors (by permission)"
ON public.contractors
FOR SELECT
USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "Only admins can create contractors" ON public.contractors;
DROP POLICY IF EXISTS "All authenticated users can create contractors" ON public.contractors;
CREATE POLICY "Can create contractors (by permission)"
ON public.contractors
FOR INSERT
WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "Only admins can update contractors" ON public.contractors;
DROP POLICY IF EXISTS "All authenticated users can update contractors" ON public.contractors;
CREATE POLICY "Can edit contractors (by permission)"
ON public.contractors
FOR UPDATE
USING (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "Admins can delete contractors" ON public.contractors;
CREATE POLICY "Can delete contractors (by permission)"
ON public.contractors
FOR DELETE
USING (public.has_permission('contacts.delete'));

-- Clients
DROP POLICY IF EXISTS "Only admins can view clients" ON public.clients;
DROP POLICY IF EXISTS "All authenticated users can view clients" ON public.clients;
CREATE POLICY "Can view clients (by permission)"
ON public.clients
FOR SELECT
USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "Only admins can create clients" ON public.clients;
DROP POLICY IF EXISTS "All authenticated users can create clients" ON public.clients;
CREATE POLICY "Can create clients (by permission)"
ON public.clients
FOR INSERT
WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "Only admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "All authenticated users can update clients" ON public.clients;
CREATE POLICY "Can edit clients (by permission)"
ON public.clients
FOR UPDATE
USING (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Can delete clients (by permission)"
ON public.clients
FOR DELETE
USING (public.has_permission('contacts.delete'));

-- Animators
DROP POLICY IF EXISTS "Only admins can view animators" ON public.animators;
DROP POLICY IF EXISTS "All authenticated users can view animators" ON public.animators;
CREATE POLICY "Can view animators (by permission)"
ON public.animators
FOR SELECT
USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "Only admins can create animators" ON public.animators;
DROP POLICY IF EXISTS "All authenticated users can create animators" ON public.animators;
CREATE POLICY "Can create animators (by permission)"
ON public.animators
FOR INSERT
WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "Only admins can update animators" ON public.animators;
DROP POLICY IF EXISTS "All authenticated users can update animators" ON public.animators;
CREATE POLICY "Can edit animators (by permission)"
ON public.animators
FOR UPDATE
USING (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "Admins can delete animators" ON public.animators;
CREATE POLICY "Can delete animators (by permission)"
ON public.animators
FOR DELETE
USING (public.has_permission('contacts.delete'));

-- Venues
DROP POLICY IF EXISTS "Only admins can view venues" ON public.venues;
DROP POLICY IF EXISTS "All authenticated users can view venues" ON public.venues;
CREATE POLICY "Can view venues (by permission)"
ON public.venues
FOR SELECT
USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "Only admins can create venues" ON public.venues;
DROP POLICY IF EXISTS "All authenticated users can create venues" ON public.venues;
CREATE POLICY "Can create venues (by permission)"
ON public.venues
FOR INSERT
WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "Only admins can update venues" ON public.venues;
DROP POLICY IF EXISTS "All authenticated users can update venues" ON public.venues;
CREATE POLICY "Can edit venues (by permission)"
ON public.venues
FOR UPDATE
USING (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "Admins can delete venues" ON public.venues;
CREATE POLICY "Can delete venues (by permission)"
ON public.venues
FOR DELETE
USING (public.has_permission('contacts.delete'));
