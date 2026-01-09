-- Fix security issue: Restrict contact information access to admins only

-- Update animators table policies
DROP POLICY IF EXISTS "All authenticated users can view animators" ON public.animators;
CREATE POLICY "Only admins can view animators" 
ON public.animators 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can create animators" ON public.animators;
CREATE POLICY "Only admins can create animators" 
ON public.animators 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can update animators" ON public.animators;
CREATE POLICY "Only admins can update animators" 
ON public.animators 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Update clients table policies
DROP POLICY IF EXISTS "All authenticated users can view clients" ON public.clients;
CREATE POLICY "Only admins can view clients" 
ON public.clients 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can create clients" ON public.clients;
CREATE POLICY "Only admins can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can update clients" ON public.clients;
CREATE POLICY "Only admins can update clients" 
ON public.clients 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Update contractors table policies
DROP POLICY IF EXISTS "All authenticated users can view contractors" ON public.contractors;
CREATE POLICY "Only admins can view contractors" 
ON public.contractors 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can create contractors" ON public.contractors;
CREATE POLICY "Only admins can create contractors" 
ON public.contractors 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can update contractors" ON public.contractors;
CREATE POLICY "Only admins can update contractors" 
ON public.contractors 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Update venues table policies
DROP POLICY IF EXISTS "All authenticated users can view venues" ON public.venues;
CREATE POLICY "Only admins can view venues" 
ON public.venues 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can create venues" ON public.venues;
CREATE POLICY "Only admins can create venues" 
ON public.venues 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "All authenticated users can update venues" ON public.venues;
CREATE POLICY "Only admins can update venues" 
ON public.venues 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);